using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelBooking.API.Features.CMS.Models;

[Table("ContactContents", Schema = "hotel")]
public class ContactContent
{
    public int Id { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int? UpdatedByUserId { get; set; }
}
