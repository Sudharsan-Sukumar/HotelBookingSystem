using System;
using System.ComponentModel.DataAnnotations.Schema;
using HotelBooking.API.Features.Bookings.Models;

namespace HotelBooking.API.Features.Payments.Models;

[Table("Payments", Schema = "hotel")]
public class Payment
{
    public int Id { get; set; }
    public int BookingId { get; set; }
    public Booking Booking { get; set; } = null!;
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }
    
    public bool UsedWallet { get; set; } = false;

    public string PaymentMethod { get; set; } = string.Empty;
    public string TransactionId { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending"; // Pending, Completed, Failed
    public string? GatewayResponse { get; set; }
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
}
