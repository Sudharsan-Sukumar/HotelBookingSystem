using System;

namespace HotelBooking.API.Features.Reports.DTOs;

public class CustomerBookingSummaryDto
{
    public int BookingId { get; set; }
    public string BookingCustomId { get; set; } = string.Empty;
    public string HotelName { get; set; } = string.Empty;
    public string RoomTypeName { get; set; } = string.Empty;
    public DateTime CheckInDate { get; set; }
    public DateTime CheckOutDate { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
}
