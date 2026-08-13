using System.ComponentModel.DataAnnotations;
using HotelBooking.API.Common.Constants;

namespace HotelBooking.API.Features.Reviews.DTOs;

public class ManagerResponseDto
{
    [Required]
    [MaxLength(500, ErrorMessage = "Manager response cannot exceed 500 characters.")]
    [RegularExpression(ValidationRegexConstants.SafeText, ErrorMessage = "Invalid response format.")]
    public string Response { get; set; } = string.Empty;
}
