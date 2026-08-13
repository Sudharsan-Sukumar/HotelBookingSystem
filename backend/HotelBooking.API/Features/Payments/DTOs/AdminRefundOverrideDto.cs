using System.ComponentModel.DataAnnotations;

namespace HotelBooking.API.Features.Payments.DTOs;

public class AdminRefundOverrideDto
{
    [Required]
    public int BookingId { get; set; }

    [Required]
    [Range(0.01, 1000000, ErrorMessage = "Amount must be greater than zero.")]
    public decimal Amount { get; set; }

    [Required]
    [MinLength(10, ErrorMessage = "Refund reason must be at least 10 characters.")]
    public string Reason { get; set; } = string.Empty;
}
