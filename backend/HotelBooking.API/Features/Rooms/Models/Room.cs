using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HotelBooking.API.Features.Hotels.Models;

namespace HotelBooking.API.Features.Rooms.Models;

[Table("Rooms", Schema = "hotel")]
public class Room
{
    public int Id { get; set; }
    public int HotelId { get; set; }
    public Hotel Hotel { get; set; } = null!;
    public int RoomTypeId { get; set; }
    public RoomType RoomType { get; set; } = null!;
    public string RoomNumber { get; set; } = string.Empty;
    public string Floor { get; set; } = string.Empty;
    public string Status { get; set; } = "Available"; // Available, Occupied, Maintenance, Cleaning
    
    [Timestamp]
    public byte[] RowVersion { get; set; } = null!;
}
