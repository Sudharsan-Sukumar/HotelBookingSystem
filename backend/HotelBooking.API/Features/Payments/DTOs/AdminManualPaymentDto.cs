using System.ComponentModel.DataAnnotations;

namespace HotelBooking.API.Features.Payments.DTOs;

/// <summary>
/// Lets an admin manually confirm a booking's payment outside Razorpay — the actual "contact
/// support to complete payment offline" capability the RazorpayUnavailableException's 503 message
/// promises during a gateway outage, which previously did not exist anywhere in the API.
/// </summary>
public class AdminManualPaymentDto
{
    [Required]
    public int BookingId { get; set; }

    // Must match the booking's actual outstanding balance exactly — same rigor as the online
    // payment-link path (CreatePaymentLinkDto.AmountToPay), so an admin cannot accidentally
    // under/over-confirm a booking.
    [Required]
    [Range(0, 1000000, ErrorMessage = "Amount must be zero or greater.")]
    public decimal Amount { get; set; }

    // Mandatory audit trail for a manually-entered financial transaction — mirrors
    // AdminCancelBookingDto's reason requirement.
    [Required]
    [MinLength(10, ErrorMessage = "Reason must be at least 10 characters.")]
    [MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
}
