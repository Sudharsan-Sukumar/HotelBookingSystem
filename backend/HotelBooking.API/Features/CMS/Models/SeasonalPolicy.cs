using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelBooking.API.Features.CMS.Models;

// Mirrors Features/Rooms/Models/PricingOverride.cs's date-range-scoped override pattern, applied
// to the cancellation/refund policy instead of room pricing — lets admin define a season (e.g.
// "Peak Season") with its own refund thresholds that temporarily supersede the SystemSettings-based
// default policy while today's date falls within [StartDate, EndDate].
[Table("SeasonalPolicies", Schema = "hotel")]
public class SeasonalPolicy
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string SeasonName { get; set; } = string.Empty;

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }

    public bool IsActive { get; set; } = true;

    public double FullRefundHours { get; set; } = 48;

    public double PartialRefundHours { get; set; } = 24;

    [Column(TypeName = "decimal(5,4)")]
    public decimal PartialRefundPercentage { get; set; } = 0.5m;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
