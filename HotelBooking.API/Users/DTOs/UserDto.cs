using System;

namespace HotelBooking.API.Users.DTOs;

public class UserDto
{
    public int Id { get; set; }
    public string UserCustomId { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? ProfilePhotoUrl { get; set; }
}
