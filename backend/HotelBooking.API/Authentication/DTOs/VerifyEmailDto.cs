using System.ComponentModel.DataAnnotations;
using HotelBooking.API.Common.Constants;

namespace HotelBooking.API.Authentication.DTOs;

public class VerifyEmailDto
{
    [Required]
    [RegularExpression(ValidationRegexConstants.Email, ErrorMessage = "Invalid email format.")]
    public string Email { get; set; } = string.Empty;

    [Required]
    [RegularExpression(ValidationRegexConstants.Otp, ErrorMessage = "Invalid Token format.")]
    public string Token { get; set; } = string.Empty;
}
