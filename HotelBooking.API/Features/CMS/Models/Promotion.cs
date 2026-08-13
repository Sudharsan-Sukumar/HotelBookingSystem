using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelBooking.API.Features.CMS.Models;

[Table("Promotions", Schema = "hotel")]
public class Promotion
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string DiscountDescription { get; set; } = string.Empty;
    public string CouponCode { get; set; } = string.Empty;
    public DateTime ValidUntil { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
