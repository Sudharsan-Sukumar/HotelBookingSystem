using System.ComponentModel.DataAnnotations;

namespace HotelBooking.API.Authentication.DTOs;

public class ResendVerificationDto
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}
