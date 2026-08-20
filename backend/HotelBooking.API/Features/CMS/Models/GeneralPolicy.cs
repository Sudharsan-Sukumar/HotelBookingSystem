using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelBooking.API.Features.CMS.Models;

// Permanent hotel-wide policies (Privacy, Terms & Conditions, Modification, Cancellation &
// Refund) — deliberately separate from SeasonalPolicy: these are NOT date-range scoped, they are
// the one always-in-effect legal/informational text shown to customers (footer modals), editable
// by Admin. One row per PolicyType, upserted by GeneralPolicyService the same way SystemSetting
// rows are upserted by key.
[Table("GeneralPolicies", Schema = "hotel")]
public class GeneralPolicy
{
    public int Id { get; set; }

    // One of GeneralPolicyType's constant values — a string column (not an enum) so it slots into
    // the same key-lookup style already used by SystemSetting.Key.
    public string PolicyType { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    // Rendered via [innerHTML] on the customer-facing footer modals, so admin can keep the same
    // heading/list formatting the hardcoded copy originally had.
    public string Content { get; set; } = string.Empty;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int? UpdatedByUserId { get; set; }
}

public static class GeneralPolicyType
{
    public const string Privacy = "Privacy";
    public const string Terms = "Terms";
    public const string Modification = "Modification";
    public const string CancellationRefund = "CancellationRefund";

    public static readonly string[] All = { Privacy, Terms, Modification, CancellationRefund };

    public static bool IsValid(string type) => Array.IndexOf(All, type) >= 0;
}
