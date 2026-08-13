using System.Security.Claims;
using System.Threading.Tasks;

namespace HotelBooking.API.Authorization.Services;

public interface ITokenAuthorizationService
{
    // Returns null when the request is authorized to proceed, or a human-readable
    // denial reason (also used as the JwtBearerEvents.OnTokenValidated failure message).
    Task<string?> GetDenialReasonAsync(ClaimsPrincipal principal);
}
