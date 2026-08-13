using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace HotelBooking.API.Features.Hotels.DTOs;

public class ImageUploadDto
{
    [Required]
    public int EntityId { get; set; } // Can be HotelId or RoomTypeId

    [Required]
    public IFormFile File { get; set; } = null!;

    public bool IsPrimary { get; set; }
}
