using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace HotelBooking.API.Users.DTOs;

public class ProfilePhotoUploadDto
{
    [Required]
    public IFormFile File { get; set; } = null!;
}
