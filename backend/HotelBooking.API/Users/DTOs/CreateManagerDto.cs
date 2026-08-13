using System.ComponentModel.DataAnnotations;
using HotelBooking.API.Common.Constants;

namespace HotelBooking.API.Users.DTOs;

public class CreateManagerDto
{
    [Required]
    [RegularExpression(ValidationRegexConstants.Name, ErrorMessage = "Name must be 2-80 characters (letters and spaces only).")]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [RegularExpression(ValidationRegexConstants.Name, ErrorMessage = "Name must be 2-80 characters (letters and spaces only).")]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [RegularExpression(ValidationRegexConstants.Email, ErrorMessage = "Invalid email format.")]
    public string Email { get; set; } = string.Empty;

    [Required]
    [RegularExpression(ValidationRegexConstants.PhoneIndia, ErrorMessage = "Phone must be exactly 10 digits and start with 6, 7, 8, or 9.")]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [RegularExpression(ValidationRegexConstants.Password, ErrorMessage = "Password must be at least 8 characters with one digit and one special character.")]
    public string TemporaryPassword { get; set; } = string.Empty;

    [Required]
    public int AssignedHotelId { get; set; }
}
