using System;

namespace HotelBooking.API.Features.Payments.DTOs;

public class AdminTransactionDto
{
    public int Id { get; set; }
    public int BookingId { get; set; }
    public string BookingCustomId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string TransactionId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? GatewayResponse { get; set; }
    public DateTime PaymentDate { get; set; }
}
