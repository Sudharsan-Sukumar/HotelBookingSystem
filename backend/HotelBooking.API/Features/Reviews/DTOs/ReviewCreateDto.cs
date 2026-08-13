using System.ComponentModel.DataAnnotations;
using HotelBooking.API.Common.Constants;

namespace HotelBooking.API.Features.Reviews.DTOs;

public class ReviewCreateDto
{
    [Required]
    public int BookingId { get; set; }

    [Required]
    [Range(1, 5, ErrorMessage = "Rating must be between 1 and 5.")]
    public int Rating { get; set; }

    [MaxLength(1000, ErrorMessage = "Comment cannot exceed 1000 characters.")]
    [RegularExpression(ValidationRegexConstants.SafeText, ErrorMessage = "Invalid comment format.")]
    public string? Comment { get; set; }
}
