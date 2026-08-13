using System;

namespace HotelBooking.API.Features.Payments.DTOs;

public class RefundResponseDto
{
    public int Id { get; set; }
    public int BookingId { get; set; }
    public string BookingCustomId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Destination { get; set; } = string.Empty;
    public bool IsAdminOverride { get; set; }
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
