using System.ComponentModel.DataAnnotations;

namespace HotelBooking.API.Features.Bookings.DTOs;

public class AdminCancelBookingDto
{
    [Required]
    [MinLength(10, ErrorMessage = "Cancellation reason must be at least 10 characters.")]
    public string Reason { get; set; } = string.Empty;
}
