using System;
using System.ComponentModel.DataAnnotations;

namespace HotelBooking.API.Features.CMS.DTOs;

public class SeasonalPolicyDto
{
    public int Id { get; set; }
    public string SeasonName { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; }
    public double FullRefundHours { get; set; }
    public double PartialRefundHours { get; set; }
    public decimal PartialRefundPercentage { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class SeasonalPolicyRequestDto
{
    [Required]
    [StringLength(100, MinimumLength = 2)]
    public string SeasonName { get; set; } = string.Empty;

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }

    public bool IsActive { get; set; } = true;

    [Range(0, 720)]
    public double FullRefundHours { get; set; } = 48;

    [Range(0, 720)]
    public double PartialRefundHours { get; set; } = 24;

    [Range(0, 1)]
    public decimal PartialRefundPercentage { get; set; } = 0.5m;
}

// Effective policy resolved for a given check-in date — what the customer-facing policy modal
// and the booking-creation snapshot both actually consume. SeasonName is null when no seasonal
// override applies and the base SystemSettings-backed default is in effect.
public class EffectiveCancellationPolicyDto
{
    public string? SeasonName { get; set; }
    public double FullRefundHours { get; set; }
    public double PartialRefundHours { get; set; }
    public decimal PartialRefundPercentage { get; set; }

    // Null when the values in effect are still the hardcoded 48h/24h/50% fallback because
    // neither a seasonal policy nor any base SystemSettings row has ever been saved.
    public DateTime? UpdatedAt { get; set; }
}
