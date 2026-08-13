using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.API.Authorization.Services;

// Decides whether an already-authenticated (signature/issuer/lifetime valid) JWT is still
// authorized to access the API: not revoked (logout / logout-all-devices), and the account
// isn't suspended/inactive. Extracted out of Program.cs's JwtBearerEvents.OnTokenValidated,
// which is authentication wiring, not the right place for authorization decisions to live.
public class TokenAuthorizationService : ITokenAuthorizationService
{
    private readonly ApplicationDbContext _context;

    public TokenAuthorizationService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<string?> GetDenialReasonAsync(ClaimsPrincipal principal)
    {
        var jti = principal.FindFirst(JwtRegisteredClaimNames.Jti)?.Value;
        if (!string.IsNullOrEmpty(jti))
        {
            var isRevoked = await _context.RevocationTokens.AnyAsync(rt => rt.Token == jti);
            if (isRevoked)
                return "This token has been revoked. Please log in again.";
        }

        var userIdString = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdString, out int userId))
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null || user.Status == "Suspended" || user.Status == "Inactive")
                return "User account is suspended or inactive.";

            if (user.SessionsInvalidatedAt.HasValue)
            {
                var iatClaim = principal.FindFirst("iat")?.Value;
                if (long.TryParse(iatClaim, out long iatUnix))
                {
                    var issuedAt = DateTimeOffset.FromUnixTimeSeconds(iatUnix).UtcDateTime;
                    if (issuedAt < user.SessionsInvalidatedAt.Value)
                        return "Your session has expired. Please log in again.";
                }
            }
        }

        return null;
    }
}
