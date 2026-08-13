using System.ComponentModel.DataAnnotations;
using HotelBooking.API.Common.Constants;

namespace HotelBooking.API.Features.Hotels.DTOs;

public class HotelRequestDto
{
    [Required]
    [RegularExpression(ValidationRegexConstants.AlphaNumericWithSpaces, ErrorMessage = "Invalid Name.")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [RegularExpression(ValidationRegexConstants.SafeText, ErrorMessage = "Invalid Description.")]
    public string Description { get; set; } = string.Empty;

    [Required]
    [RegularExpression(ValidationRegexConstants.SafeText, ErrorMessage = "Invalid Location.")]
    public string Location { get; set; } = string.Empty;

    [Required]
    [RegularExpression(ValidationRegexConstants.Name, ErrorMessage = "Invalid City.")]
    public string City { get; set; } = string.Empty;

    [Required]
    [RegularExpression(ValidationRegexConstants.Name, ErrorMessage = "Invalid State.")]
    public string State { get; set; } = string.Empty;

    [Required]
    [RegularExpression(ValidationRegexConstants.Name, ErrorMessage = "Invalid Country.")]
    public string Country { get; set; } = string.Empty;

    [Required]
    [RegularExpression(ValidationRegexConstants.PinCodeIndia, ErrorMessage = "ZipCode must be 6 digits.")]
    public string ZipCode { get; set; } = string.Empty;

    [Required]
    [Range(1, 5, ErrorMessage = "Star rating must be between 1 and 5.")]
    public int StarRating { get; set; }

    [Required]
    public bool IsActive { get; set; } = true;

    public string? RowVersion { get; set; }
}
