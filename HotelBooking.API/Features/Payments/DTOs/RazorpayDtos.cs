using System.ComponentModel.DataAnnotations;

namespace HotelBooking.API.Features.Payments.DTOs;

public class CreatePaymentLinkDto
{
    [Required]
    public int BookingId { get; set; }

    [Required]
    [MaxLength(50)]
    public string PaymentMethod { get; set; } = string.Empty;

    [Required]
    [Range(0, 1000000, ErrorMessage = "Amount must be zero or greater.")]
    public decimal AmountToPay { get; set; }

    public bool UseWalletBalance { get; set; }
}

public class PaymentLinkResponseDto
{
    public string PaymentLinkId { get; set; } = string.Empty;

    // Open this directly in any browser to pay — no JS widget required. Empty when the wallet
    // alone covered the full amount and the booking was confirmed without needing Razorpay at all.
    public string PaymentUrl { get; set; } = string.Empty;
    public string Reference { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string BookingStatus { get; set; } = string.Empty;
}

public class RazorpayPaymentStatusDto
{
    public string Reference { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? RazorpayPaymentId { get; set; }
    public decimal Amount { get; set; }
}
