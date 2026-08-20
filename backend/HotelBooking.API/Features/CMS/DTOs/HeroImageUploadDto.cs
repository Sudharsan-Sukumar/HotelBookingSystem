using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace HotelBooking.API.Features.CMS.DTOs;

public class HeroImageUploadDto
{
    [Required]
    public IFormFile File { get; set; } = null!;
}
