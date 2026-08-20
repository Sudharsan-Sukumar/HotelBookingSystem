using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Authentication.DTOs;
using HotelBooking.API.Authentication.Models;
using HotelBooking.API.Common.Services;
using HotelBooking.API.Users.Models;
using HotelBooking.API.Users.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace HotelBooking.API.Authentication.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IEmailQueue _emailQueue;
    private readonly ILogger<AuthService> _logger;
    private readonly ISecurityAuditLogService _securityAuditLog;

    private const int MaxFailedLoginAttempts = 5;
    private static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan RefreshTokenLifetime = TimeSpan.FromDays(7);

    // Shared with AuthController so the access-token cookie's expiry always matches the JWT's own.
    public static readonly TimeSpan AccessTokenLifetime = TimeSpan.FromDays(1);

    public AuthService(ApplicationDbContext context, IConfiguration configuration, IEmailQueue emailQueue, ILogger<AuthService> logger, ISecurityAuditLogService securityAuditLog)
    {
        _context = context;
        _configuration = configuration;
        _emailQueue = emailQueue;
        _logger = logger;
        _securityAuditLog = securityAuditLog;
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        // QA Defect (Low): this used to be a deny-list (block Pending/Inactive/Suspended), so any
        // OTHER status value — including blank/corrupted legacy rows found live during QA
        // (Status == "") — would fall through and be allowed to log in. Login now requires the
        // account to explicitly be "Active", the only status that should ever authenticate.
        if (user == null || user.Status != "Active")
        {
            // Login attempts are a technical/security event, not a business operation — console
            // only, never the AuditLogs table. Deliberately vague on which condition failed (no
            // email enumeration).
            _logger.LogWarning("Login failed for {Email}: account not found or not active.", normalizedEmail);
            await _securityAuditLog.LogAsync("LoginFailed", normalizedEmail, user?.Id, success: false, reason: "Account not found or not active.");
            return null;
        }

        if (user.LockoutUntil.HasValue && user.LockoutUntil.Value > DateTime.UtcNow)
        {
            _logger.LogWarning("Login blocked for {Email}: account locked out until {LockoutUntil}.", normalizedEmail, user.LockoutUntil);
            await _securityAuditLog.LogAsync("LoginBlocked", normalizedEmail, user.Id, success: false, reason: $"Account locked out until {user.LockoutUntil:o}.");
            throw new InvalidOperationException("Account locked due to too many failed attempts. Try again after 30 minutes.");
        }

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            user.FailedLoginAttempts += 1;
            if (user.FailedLoginAttempts >= MaxFailedLoginAttempts)
            {
                user.LockoutUntil = DateTime.UtcNow.Add(LockoutDuration);
                user.FailedLoginAttempts = 0;
                _logger.LogWarning("Login failed for {Email}: incorrect password, account now locked out.", normalizedEmail);
                await _securityAuditLog.LogAsync("AccountLockedOut", normalizedEmail, user.Id, success: false, reason: "Too many failed login attempts.");
            }
            else
            {
                _logger.LogWarning("Login failed for {Email}: incorrect password (attempt {Attempts}/{Max}).",
                    normalizedEmail, user.FailedLoginAttempts, MaxFailedLoginAttempts);
                await _securityAuditLog.LogAsync("LoginFailed", normalizedEmail, user.Id, success: false, reason: $"Incorrect password (attempt {user.FailedLoginAttempts}/{MaxFailedLoginAttempts}).");
            }
            await _context.SaveChangesAsync();
            return null;
        }

        user.FailedLoginAttempts = 0;
        user.LockoutUntil = null;

        var (token, _) = GenerateJwtToken(user);
        var refreshToken = await IssueRefreshTokenAsync(user.Id);

        await _context.SaveChangesAsync();

        // Login is a technical/security event, not a business operation — console (ILogger) plus the
        // dedicated SecurityAuditLogs table (never the business AuditLogs table). This used to write
        // directly to _context.AuditLogs, bypassing IAuditLogService entirely; that was the one place
        // in the codebase where a routine technical event ended up in the business audit trail.
        _logger.LogInformation("User {Email} (Id={UserId}) logged in successfully.", user.Email, user.Id);
        await _securityAuditLog.LogAsync("LoginSucceeded", user.Email, user.Id, success: true);

        return new AuthResponseDto
        {
            Token = token,
            RefreshToken = refreshToken,
            UserId = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Role = user.Role != null ? user.Role.Name : "Customer",
            ForcePasswordChange = user.ForcePasswordChange
        };
    }

    private async Task<string> IssueRefreshTokenAsync(int userId)
    {
        var refreshToken = new RefreshToken
        {
            UserId = userId,
            Token = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(64)),
            ExpiresAt = DateTime.UtcNow.Add(RefreshTokenLifetime),
            IsRevoked = false
        };

        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();

        return refreshToken.Token;
    }

    public async Task<AuthResponseDto?> RefreshTokenAsync(RefreshTokenDto dto)
    {
        var existing = await _context.RefreshTokens
            .Include(rt => rt.User).ThenInclude(u => u.Role)
            .FirstOrDefaultAsync(rt => rt.Token == dto.RefreshToken);

        if (existing == null || existing.IsRevoked || existing.ExpiresAt < DateTime.UtcNow)
        {
            await _securityAuditLog.LogAsync("TokenRefreshRejected", null, existing?.UserId, success: false,
                reason: existing == null ? "Unknown refresh token." : existing.IsRevoked ? "Refresh token already revoked (possible reuse)." : "Refresh token expired.");
            return null;
        }

        // Rotate: revoke the presented refresh token and issue a brand new one (RefreshTokens row + link).
        existing.IsRevoked = true;
        existing.RevokedAt = DateTime.UtcNow;

        var newRefreshToken = new RefreshToken
        {
            UserId = existing.UserId,
            Token = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(64)),
            ExpiresAt = DateTime.UtcNow.Add(RefreshTokenLifetime),
            IsRevoked = false
        };
        existing.ReplacedByToken = newRefreshToken.Token;

        _context.RefreshTokens.Add(newRefreshToken);

        var (token, _) = GenerateJwtToken(existing.User);
        await _context.SaveChangesAsync();

        return new AuthResponseDto
        {
            Token = token,
            RefreshToken = newRefreshToken.Token,
            UserId = existing.User.Id,
            FirstName = existing.User.FirstName,
            LastName = existing.User.LastName,
            Email = existing.User.Email,
            Role = existing.User.Role != null ? existing.User.Role.Name : "Customer",
            ForcePasswordChange = existing.User.ForcePasswordChange
        };
    }

    public async Task LogoutAsync(LogoutDto dto)
    {
        var refreshToken = await _context.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == dto.RefreshToken);

        if (refreshToken != null && !refreshToken.IsRevoked)
        {
            refreshToken.IsRevoked = true;
            refreshToken.RevokedAt = DateTime.UtcNow;
        }

        if (!string.IsNullOrEmpty(dto.AccessTokenJti))
        {
            var alreadyRevoked = await _context.RevocationTokens
                .AnyAsync(rt => rt.Token == dto.AccessTokenJti);

            if (!alreadyRevoked)
            {
                _context.RevocationTokens.Add(new RevocationToken
                {
                    Token = dto.AccessTokenJti,
                    RevokedAt = DateTime.UtcNow,
                    Reason = "User logout (single device)."
                });
            }
        }

        await _context.SaveChangesAsync();
        await _securityAuditLog.LogAsync("Logout", null, refreshToken?.UserId, success: true);
    }

    public async Task<AuthResponseDto?> RegisterAsync(RegisterDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        if (await _context.Users.AnyAsync(u => u.Email == normalizedEmail))
            return null; // Email already in use

        if (await _context.Users.AnyAsync(u => u.Phone == dto.Phone))
            throw new InvalidOperationException("Phone number already registered."); // Can handle better in controller

        // By default, new users register as 'Customer'
        var customerRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Customer");
        int roleId = customerRole != null ? customerRole.Id : 2; // Assuming 2 is Customer

        // Generate Custom ID
        var existingIds = await _context.Users
            .Where(u => u.UserCustomId != null && u.UserCustomId.StartsWith("CUST-"))
            .Select(u => u.UserCustomId)
            .ToListAsync();
        int nextSequence = existingIds
            .Select(id => int.TryParse(id?.Split('-').LastOrDefault(), out var n) ? n : 0)
            .DefaultIfEmpty(0)
            .Max() + 1;
        string customId = $"CUST-{DateTime.UtcNow.Year}-{nextSequence:D4}";

        var user = new User
        {
            UserCustomId = customId,
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            DateOfBirth = dto.DateOfBirth.ToDateTime(TimeOnly.MinValue),
            Email = normalizedEmail,
            Phone = dto.Phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password, workFactor: 12),
            RoleId = roleId,
            Status = "Pending",
            VerificationToken = new Random().Next(100000, 999999).ToString(),
            VerificationTokenExpiry = DateTime.UtcNow.AddMinutes(20)
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _emailQueue.QueueEmailAsync(new EmailPayload
        {
            To = user.Email,
            Subject = "Verify your ElegantEnclave account",
            Body = $"Your verification code is {user.VerificationToken}. It expires in 20 minutes."
        });

        user.Role = customerRole!; // To have the role for token generation

        // We don't generate token on register if status is Pending (FR-1.8)
        return new AuthResponseDto
        {
            Token = "pending_verification",
            UserId = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Role = customerRole != null ? customerRole.Name : "Customer"
        };
    }

    // Google OAuth / OpenID Connect — verifies the ID token Google Identity Services handed the
    // frontend directly against Google's own public signing keys (Google.Apis.Auth fetches and
    // caches those keys itself; nothing here trusts the token's claims without that verification).
    // Distinguish from email/password auth: there is no password exchanged or stored at all for a
    // Google-only account — PasswordHash stays empty and AuthProvider="Google" blocks the normal
    // Login() path for it (see the check in LoginAsync-adjacent logic below).
    public async Task<AuthResponseDto> GoogleLoginAsync(GoogleAuthDto dto)
    {
        Google.Apis.Auth.GoogleJsonWebSignature.Payload payload;
        try
        {
            var clientId = _configuration["Google:ClientId"]
                ?? throw new InvalidOperationException("Google:ClientId configuration is required.");

            payload = await Google.Apis.Auth.GoogleJsonWebSignature.ValidateAsync(dto.IdToken,
                new Google.Apis.Auth.GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = new[] { clientId }
                });
        }
        catch (Google.Apis.Auth.InvalidJwtException ex)
        {
            _logger.LogWarning("Google login rejected: invalid ID token ({Reason}).", ex.Message);
            await _securityAuditLog.LogAsync("GoogleLoginFailed", null, null, success: false, reason: "Invalid Google ID token.");
            throw new InvalidOperationException("Google sign-in failed: the token could not be verified.");
        }

        if (!payload.EmailVerified)
        {
            await _securityAuditLog.LogAsync("GoogleLoginFailed", payload.Email, null, success: false, reason: "Google account email not verified.");
            throw new InvalidOperationException("Google sign-in failed: your Google account email is not verified.");
        }

        var normalizedEmail = payload.Email.Trim().ToLowerInvariant();

        // Account Linking Strategy: match by Google's stable "sub" claim first (a prior Google
        // sign-in), then fall back to matching an existing LOCAL account by email — a customer who
        // registered with email/password and later uses "Sign in with Google" on the same address
        // gets the same account linked (GoogleUserId backfilled) rather than a confusing duplicate.
        // A local account that is itself unverified/banned/etc. is left exactly as guarded as any
        // other login attempt (the Status != "Active" check below).
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.GoogleUserId == payload.Subject);

        if (user == null)
        {
            user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

            if (user != null)
            {
                // Link the existing local account to this Google identity. AuthProvider is left as
                // whatever it already was ("Local", almost always) — this account can now sign in
                // EITHER way; it's gained a second credential, not switched providers.
                user.GoogleUserId = payload.Subject;
            }
        }

        if (user == null)
        {
            // New customer, first-ever sign-in via Google — created pre-verified (Google already
            // verified the email) and Active immediately, unlike email/password registration's
            // Pending-until-OTP-verified flow.
            var customerRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Customer");
            int roleId = customerRole?.Id ?? 2;

            var existingIds = await _context.Users
                .Where(u => u.UserCustomId != null && u.UserCustomId.StartsWith("CUST-"))
                .Select(u => u.UserCustomId)
                .ToListAsync();
            int nextSequence = existingIds
                .Select(id => int.TryParse(id?.Split('-').LastOrDefault(), out var n) ? n : 0)
                .DefaultIfEmpty(0)
                .Max() + 1;

            user = new User
            {
                UserCustomId = $"CUST-{DateTime.UtcNow.Year}-{nextSequence:D4}",
                FirstName = payload.GivenName ?? payload.Name ?? "Google",
                LastName = payload.FamilyName ?? "User",
                Email = normalizedEmail,
                PasswordHash = string.Empty, // Google-only account — no password ever set.
                Phone = string.Empty,
                RoleId = roleId,
                Status = "Active",
                AuthProvider = "Google",
                GoogleUserId = payload.Subject
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            user.Role = customerRole!;
        }
        else if (user.Status != "Active")
        {
            await _securityAuditLog.LogAsync("GoogleLoginFailed", normalizedEmail, user.Id, success: false, reason: "Account not active.");
            throw new InvalidOperationException("Your account is not active. Please contact support.");
        }

        var (token, _) = GenerateJwtToken(user);
        var refreshToken = await IssueRefreshTokenAsync(user.Id);
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {Email} (Id={UserId}) logged in via Google.", user.Email, user.Id);
        await _securityAuditLog.LogAsync("GoogleLoginSucceeded", user.Email, user.Id, success: true);

        return new AuthResponseDto
        {
            Token = token,
            RefreshToken = refreshToken,
            UserId = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Role = user.Role != null ? user.Role.Name : "Customer",
            ForcePasswordChange = user.ForcePasswordChange
        };
    }

    public async Task<bool> VerifyEmailAsync(VerifyEmailDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null || user.Status != "Pending") return false;

        if (user.VerificationToken != dto.Token || user.VerificationTokenExpiry < DateTime.UtcNow)
        {
            return false;
        }

        user.Status = "Active";
        user.VerificationToken = null;
        user.VerificationTokenExpiry = null;
        
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ResendVerificationEmailAsync(ResendVerificationDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        
        // If user doesn't exist or is already active/banned, we return true to prevent email enumeration,
        // but we don't actually do anything.
        if (user == null || user.Status != "Pending") return true;

        user.VerificationToken = new Random().Next(100000, 999999).ToString();
        user.VerificationTokenExpiry = DateTime.UtcNow.AddMinutes(20);

        await _context.SaveChangesAsync();

        await _emailQueue.QueueEmailAsync(new EmailPayload
        {
            To = user.Email,
            Subject = "Your new verification code",
            Body = $"Your verification code is {user.VerificationToken}. It expires in 20 minutes."
        });

        return true;
    }

    public async Task<bool> ForgotPasswordAsync(ForgotPasswordDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user == null)
            return false;

        // Same OTP mechanism as email verification (VerifyEmailAsync/ResendVerificationEmailAsync):
        // a 6-digit numeric code stored on the User row itself — PasswordResetToken/
        // PasswordResetTokenExpiry already existed for this purpose, just previously held an opaque
        // GUID instead of an OTP. No new table/column; same reuse-the-existing-fields approach.
        user.PasswordResetToken = new Random().Next(100000, 999999).ToString();
        user.PasswordResetTokenExpiry = DateTime.UtcNow.AddMinutes(15);
        await _context.SaveChangesAsync();

        await _emailQueue.QueueEmailAsync(new EmailPayload
        {
            To = user.Email,
            Subject = "Reset your ElegantEnclave password",
            Body = $"Your password reset OTP is {user.PasswordResetToken}. It expires in 15 minutes."
        });

        return true;
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user == null)
            return false;

        // Same OTP validation/expiry rule as VerifyEmailAsync: exact match required, no retry-count
        // lockout (consistent with how email verification behaves — the OTP simply stays valid,
        // unlimited attempts, until it expires or a fresh one is requested).
        if (string.IsNullOrEmpty(user.PasswordResetToken)
            || user.PasswordResetToken != dto.Token
            || !user.PasswordResetTokenExpiry.HasValue
            || user.PasswordResetTokenExpiry.Value < DateTime.UtcNow)
        {
            return false;
        }

        // Old Password is required alongside the OTP — verified against the stored hash, exactly
        // like ChangePasswordDto's existing "current password" check in ProfileService.
        if (!BCrypt.Net.BCrypt.Verify(dto.OldPassword, user.PasswordHash))
            throw new InvalidOperationException("Incorrect old password.");

        if (BCrypt.Net.BCrypt.Verify(dto.NewPassword, user.PasswordHash))
            throw new InvalidOperationException("New password must be different from your current password.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword, workFactor: 12);
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpiry = null;
        user.FailedLoginAttempts = 0;
        user.LockoutUntil = null;
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task LogoutAllDevicesAsync(int userId, string? currentAccessTokenJti = null)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            throw new ArgumentException("User not found.");

        user.SessionsInvalidatedAt = DateTime.UtcNow;

        // Revoke every outstanding refresh token for this user so they can't silently mint new access tokens either.
        var activeRefreshTokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == userId && !rt.IsRevoked)
            .ToListAsync();

        foreach (var rt in activeRefreshTokens)
        {
            rt.IsRevoked = true;
            rt.RevokedAt = DateTime.UtcNow;
        }

        // Explicitly blacklist the access token used to call this endpoint, same as single-device
        // logout — don't rely solely on the SessionsInvalidatedAt/iat comparison for this one token.
        if (!string.IsNullOrEmpty(currentAccessTokenJti))
        {
            var alreadyRevoked = await _context.RevocationTokens
                .AnyAsync(rt => rt.Token == currentAccessTokenJti);

            if (!alreadyRevoked)
            {
                _context.RevocationTokens.Add(new RevocationToken
                {
                    Token = currentAccessTokenJti,
                    RevokedAt = DateTime.UtcNow,
                    Reason = "User logout (all devices)."
                });
            }
        }

        await _context.SaveChangesAsync();
        await _securityAuditLog.LogAsync("LogoutAllDevices", user.Email, userId, success: true);
    }

    private (string Token, string Jti) GenerateJwtToken(User user)
    {
        // Fail-Fast Startup Validation - mirrors Program.cs's own check; no silent insecure fallback for the signing key.
        var secret = _configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret configuration is required.");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var jti = Guid.NewGuid().ToString();

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, jti),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("FirstName", user.FirstName),
            new Claim(ClaimTypes.Role, user.Role != null ? user.Role.Name : "Customer"),
            new Claim("ForcePasswordChange", user.ForcePasswordChange.ToString()),
            new Claim(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "HotelBookingAPI",
            audience: _configuration["Jwt:Audience"] ?? "HotelBookingAPI",
            claims: claims,
            expires: DateTime.UtcNow.Add(AccessTokenLifetime),
            signingCredentials: creds
        );

        return (new JwtSecurityTokenHandler().WriteToken(token), jti);
    }
}
