using System.ComponentModel.DataAnnotations;
using HotelBooking.API.Common.Constants;

namespace HotelBooking.API.Features.CMS.DTOs;

public class NotificationRequestDto
{
    public int? UserId { get; set; } // Null for system-wide broadcast

    [Required]
    [RegularExpression(ValidationRegexConstants.SafeText, ErrorMessage = "Invalid Message format.")]
    public string Message { get; set; } = string.Empty;

    [Required]
    public string Type { get; set; } = "Info"; // Info, Alert, Warning
}
