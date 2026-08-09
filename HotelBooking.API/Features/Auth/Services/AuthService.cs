using System;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Auth.DTOs;
using HotelBooking.API.Features.Users.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace HotelBooking.API.Features.Auth.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;

    public AuthService(ApplicationDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user == null || user.Status == "Pending" || user.Status == "Inactive" || user.Status == "Suspended")
            return null;

        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return null;

        var token = GenerateJwtToken(user);

        // Track Login History using AuditLog
        var audit = new AuditLog
        {
            EntityName = "UserSession",
            EntityId = user.Id,
            Action = "Login",
            Changes = $"User {user.Email} logged in successfully.",
            ChangedByUserId = user.Id,
            Timestamp = DateTime.UtcNow
        };
        _context.AuditLogs.Add(audit);
        await _context.SaveChangesAsync();

        return new AuthResponseDto
        {
            Token = token,
            UserId = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Role = user.Role != null ? user.Role.Name : "Customer"
            // We could add ForcePasswordChange flag to DTO if needed
        };
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
            DateOfBirth = dto.DateOfBirth,
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
        
        // In a real application, send verification email with token here.

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
        
        // In a real application, send the email here.
        // await _emailService.SendEmailAsync(user.Email, "New Verification OTP", user.VerificationToken);

        return true;
    }

    public async Task<bool> ForgotPasswordAsync(ForgotPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
            return false;

        // In a real application, you would generate a reset token, save it to DB, and send an email.
        // For now, we simulate success.
        return true;
    }

    private string GenerateJwtToken(User user)
    {
        // For development, hardcode a secret if not in appsettings
        var secret = _configuration["Jwt:Secret"] ?? "SuperSecretKeyThatIsVeryLongAndSecure12345!";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("FirstName", user.FirstName),
            new Claim(ClaimTypes.Role, user.Role != null ? user.Role.Name : "Customer")
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "HotelBookingAPI",
            audience: _configuration["Jwt:Audience"] ?? "HotelBookingAPI",
            claims: claims,
            expires: DateTime.Now.AddDays(1),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
