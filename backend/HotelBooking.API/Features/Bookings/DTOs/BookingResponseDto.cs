using System;

namespace HotelBooking.API.Features.Bookings.DTOs;

public class BookingResponseDto
{
    public int Id { get; set; }
    public string BookingCustomId { get; set; } = string.Empty;
    public string HotelName { get; set; } = string.Empty;
    public string RoomTypeName { get; set; } = string.Empty;
    public DateTime CheckInDate { get; set; }
    public DateTime CheckOutDate { get; set; }
    public int NumberOfRooms { get; set; }
    public string? SpecialRequests { get; set; }

    // Only populated once the booking is Confirmed/CheckedIn/CheckedOut/Completed — null otherwise
    // (e.g. while still "Pending Payment"), per BookingService.MapToDto.
    public string? IDProofType { get; set; }
    public string? IDProofNumber { get; set; }

    public decimal BaseCost { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal WalletAmountUsed { get; set; }
    public decimal TotalAmount { get; set; }
    
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    // Base64 RowVersion — round-tripped back on modify so a stale multi-tab edit is detected
    // (mirrors HotelResponseDto's RowVersion convention).
    public string RowVersion { get; set; } = string.Empty;
}
