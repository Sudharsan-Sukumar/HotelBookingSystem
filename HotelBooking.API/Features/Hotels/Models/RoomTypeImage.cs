using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HotelBooking.API.Features.Rooms.Models;

namespace HotelBooking.API.Features.Hotels.Models;

[Table("RoomTypeImages", Schema = "hotel")]
public class RoomTypeImage
{
    [Key]
    public int Id { get; set; }

    [Required]
    public int RoomTypeId { get; set; }

    [ForeignKey("RoomTypeId")]
    public RoomType RoomType { get; set; } = null!;

    [Required]
    [MaxLength(2048)]
    public string Url { get; set; } = string.Empty;

    public string FileHash { get; set; } = string.Empty;

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
