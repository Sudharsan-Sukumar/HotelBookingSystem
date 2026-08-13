namespace HotelBooking.API.Features.Rooms.DTOs;

public class RoomTypeResponseDto
{
    public int Id { get; set; }
    public int HotelId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal BasePrice { get; set; }
    public int Capacity { get; set; }
    public int TotalRooms { get; set; }
    public bool IsActive { get; set; }
    public bool IsUnderMaintenance { get; set; }
}
