using System.ComponentModel.DataAnnotations;

namespace HotelBooking.API.Authentication.DTOs;

// The Angular frontend uses Google Identity Services (google.accounts.id) to obtain this ID token
// directly from Google — the frontend never sees or handles a client secret; only this signed JWT
// (verified server-side against Google's public keys, see AuthService.GoogleLoginAsync) crosses
// the wire.
public class GoogleAuthDto
{
    [Required]
    public string IdToken { get; set; } = string.Empty;
}
