using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelBooking.API.Features.Payments.Models;

[Table("RazorpayPayments", Schema = "hotel")]
public class RazorpayPayment
{
    public int Id { get; set; }

    // The reference_id actually sent to Razorpay. Razorpay requires this to be globally unique
    // FOREVER (not just while unpaid) — reusing a plain booking ID across retries/modifications
    // gets rejected with "payment link with given reference_id already exists", so this is always
    // a fresh value per attempt (see RazorpayPaymentService.CreatePaymentLinkAsync). The actual
    // link back to a booking is the BookingId column below, not this string.
    public string Reference { get; set; } = string.Empty;

    // Authoritative link back to the booking this payment is for. Nullable because a payment
    // isn't required to be tied to a booking (kept flexible, matching the original design).
    public int? BookingId { get; set; }

    public string PhoneNumber { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "INR";

    public string? RazorpayPaymentId { get; set; }
    public string? RazorpayPaymentLinkId { get; set; }
    public string? PaymentLinkUrl { get; set; }

    public string Status { get; set; } = "Created"; // Created, Paid, Failed
    public string? FailureReason { get; set; }

    // The customer's declared payment method (e.g. "Net Banking") — Razorpay's hosted page is what
    // actually decides how the customer pays, this is only carried through to the Payment record
    // created once the link is paid, for reporting purposes.
    public string? PaymentMethod { get; set; }

    // Wallet amount to deduct once this link is actually paid — computed and validated at link
    // creation time but NOT applied until payment confirms, so an abandoned/expired link never
    // leaves a customer's wallet wrongly debited.
    [Column(TypeName = "decimal(18,2)")]
    public decimal WalletAmountApplied { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Payment Session Snapshot — captures the admin-configured "IsUpiEnabled" toggle AS IT WAS at
    // link-creation time, so a later admin toggle can never retroactively change what an already
    // in-flight payment session is presented as having offered. Null for payments created before
    // this snapshot existed.
    public bool? IsUpiEnabledSnapshot { get; set; }
}
