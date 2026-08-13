using System.ComponentModel.DataAnnotations;
using HotelBooking.API.Common.Constants;

namespace HotelBooking.API.Features.Rooms.DTOs;

public class RoomTypeRequestDto
{
    [Required]
    [RegularExpression(ValidationRegexConstants.SafeText, ErrorMessage = "Invalid Name format.")]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [Required]
    [Range(0.01, 100000)]
    public decimal BasePrice { get; set; }

    [Required]
    [Range(1, 10)]
    public int Capacity { get; set; }

    [Required]
    [Range(1, 1000)]
    public int TotalRooms { get; set; }
}
