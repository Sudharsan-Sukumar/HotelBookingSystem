using System.ComponentModel.DataAnnotations;
using HotelBooking.API.Common.Constants;

namespace HotelBooking.API.Authentication.DTOs;

public class ForgotPasswordDto
{
    [Required]
    [RegularExpression(ValidationRegexConstants.Email, ErrorMessage = "Invalid email format.")]
    public string Email { get; set; } = string.Empty;
}
