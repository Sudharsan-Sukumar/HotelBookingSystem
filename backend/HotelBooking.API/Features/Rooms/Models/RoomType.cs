using System.ComponentModel.DataAnnotations.Schema;
using HotelBooking.API.Features.Hotels.Models;

namespace HotelBooking.API.Features.Rooms.Models;

[Table("RoomTypes", Schema = "hotel")]
public class RoomType
{
    public int Id { get; set; }
    public int HotelId { get; set; }
    public Hotel Hotel { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    [Column(TypeName = "decimal(18,2)")]
    public decimal BasePrice { get; set; }
    
    public int Capacity { get; set; }
    public int TotalRooms { get; set; }
    public bool IsActive { get; set; } = true;

    // Admin Edge Case #14: while true, other detail edits are rejected (row-lock semantics for concurrent maintenance updates).
    public bool IsUnderMaintenance { get; set; } = false;

    [System.ComponentModel.DataAnnotations.Timestamp]
    public byte[] RowVersion { get; set; } = null!;
}
