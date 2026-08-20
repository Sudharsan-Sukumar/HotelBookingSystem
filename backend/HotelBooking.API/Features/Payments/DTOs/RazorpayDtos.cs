using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HotelBooking.API.Features.Payments.DTOs;

public class CreatePaymentLinkDto : IValidatableObject
{
    // BUG-004 fix: mirrors the Angular frontend's own PAYMENT_METHODS constant
    // (core/models/payment.model.ts) — previously any string up to 50 chars was accepted and
    // persisted as-is, including values like "Bitcoin" that would then surface in admin
    // transaction reports.
    private static readonly string[] AllowedPaymentMethods =
    {
        "Credit Card", "Debit Card", "Net Banking", "UPI"
    };

    [Required]
    public int BookingId { get; set; }

    [Required]
    [MaxLength(50)]
    public string PaymentMethod { get; set; } = string.Empty;

    [Required]
    [Range(0, 1000000, ErrorMessage = "Amount must be zero or greater.")]
    public decimal AmountToPay { get; set; }

    public bool UseWalletBalance { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!string.IsNullOrEmpty(PaymentMethod) && System.Array.IndexOf(AllowedPaymentMethods, PaymentMethod) < 0)
        {
            yield return new ValidationResult(
                $"PaymentMethod must be one of: {string.Join(", ", AllowedPaymentMethods)}.",
                new[] { nameof(PaymentMethod) });
        }
    }
}

public class PaymentLinkResponseDto
{
    public string PaymentLinkId { get; set; } = string.Empty;

    // Open this directly in any browser to pay — no JS widget required. Empty when the wallet
    // alone covered the full amount and the booking was confirmed without needing Razorpay at all.
    public string PaymentUrl { get; set; } = string.Empty;
    public string Reference { get; set; } = string.Empty;

    // Amount actually charged by THIS link — may be less than the booking's full outstanding
    // balance when that balance exceeds Razorpay:MaxPaymentLinkAmount (split-payment fallback).
    public decimal Amount { get; set; }
    public string BookingStatus { get; set; } = string.Empty;

    // True when the booking's outstanding balance exceeded this Razorpay account's single-link
    // cap and had to be split — RemainingAfterThisPayment is what the customer must still pay via
    // another CreatePaymentLinkAsync call once this link is paid. Zero/false for the normal,
    // single-payment case.
    public bool IsPartialPayment { get; set; }
    public decimal RemainingAfterThisPayment { get; set; }
}

public class RazorpayPaymentStatusDto
{
    public string Reference { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? RazorpayPaymentId { get; set; }
    public decimal Amount { get; set; }

    // Mirrors PaymentLinkResponseDto's split-payment fields so the frontend's status poll can tell
    // "this chunk paid, booking fully settled" apart from "this chunk paid, more still owed" without
    // a separate call.
    public bool IsPartialPayment { get; set; }
    public decimal RemainingAfterThisPayment { get; set; }
    public string BookingStatus { get; set; } = string.Empty;
}
