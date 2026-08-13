namespace HotelBooking.API.Authentication.DTOs;

public class LogoutDto
{
    // Optional: if omitted, only the access token (via jti, taken from the caller's own token) is revoked.
    public string? RefreshToken { get; set; }

    // Populated server-side from the caller's own JWT "jti" claim, not supplied by the client.
    public string? AccessTokenJti { get; set; }
}
