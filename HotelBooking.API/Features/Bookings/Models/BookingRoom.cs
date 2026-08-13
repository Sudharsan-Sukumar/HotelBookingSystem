using System.ComponentModel.DataAnnotations.Schema;
using HotelBooking.API.Features.Rooms.Models;

namespace HotelBooking.API.Features.Bookings.Models;

[Table("BookingRooms", Schema = "hotel")]
public class BookingRoom
{
    public int BookingId { get; set; }
    public Booking Booking { get; set; } = null!;
    public int RoomId { get; set; }
    public Room Room { get; set; } = null!;
}
