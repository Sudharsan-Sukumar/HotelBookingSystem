using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelBooking.API.Authentication.Models;

[Table("RevocationTokens", Schema = "hotel")]
public class RevocationToken
{
    public int Id { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime RevokedAt { get; set; } = DateTime.UtcNow;
    public string Reason { get; set; } = string.Empty;
}
