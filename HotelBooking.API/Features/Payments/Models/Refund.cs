using System;
using System.ComponentModel.DataAnnotations.Schema;
using HotelBooking.API.Features.Bookings.Models;

namespace HotelBooking.API.Features.Payments.Models;

[Table("Refunds", Schema = "hotel")]
public class Refund
{
    public int Id { get; set; }
    public int BookingId { get; set; }
    public Booking Booking { get; set; } = null!;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    public string Status { get; set; } = "Initiated"; // Initiated, Processing, Completed
    public string Destination { get; set; } = "Wallet"; // Wallet or OriginalPaymentMethod

    public int? InitiatedByUserId { get; set; }
    public bool IsAdminOverride { get; set; } = false;
    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}
