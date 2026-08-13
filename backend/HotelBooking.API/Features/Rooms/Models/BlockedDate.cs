using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelBooking.API.Features.Rooms.Models;

[Table("BlockedDates", Schema = "hotel")]
public class BlockedDate
{
    public int Id { get; set; }
    public int RoomTypeId { get; set; }
    public RoomType RoomType { get; set; } = null!;

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; } // exclusive, same convention as PricingOverride

    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
