using System;
using System.ComponentModel.DataAnnotations.Schema;
using HotelBooking.API.Users.Models;

namespace HotelBooking.API.Authentication.Models;

[Table("RefreshTokens", Schema = "hotel")]
public class RefreshToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; }
    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByToken { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
