using System;

namespace HotelBooking.API.Features.Rooms.DTOs;

public class BlockedDateResponseDto
{
    public int Id { get; set; }
    public int RoomTypeId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string? Reason { get; set; }
}
