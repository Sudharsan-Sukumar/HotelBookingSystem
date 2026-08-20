namespace HotelBooking.API.Features.Payments.Services;

// Options Pattern — strongly-typed target bound from the "Razorpay" config section via IOptions<T>.
public class RazorpayOptions
{
    public const string SectionName = "Razorpay";

    public string KeyId { get; set; } = string.Empty;
    public string KeySecret { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;

    // Fallback mechanism for bookings whose outstanding balance exceeds what this Razorpay account
    // is currently allowed to charge in a single Payment Link (unactivated/test accounts are capped
    // well below live-account limits — see RazorpayPaymentService.CreatePaymentLinkAsync). Not a
    // secret, so it has a real default here rather than requiring a .env/User Secrets entry; override
    // via config (Razorpay:MaxPaymentLinkAmount) once the account is activated and the real cap is
    // known, or to test the split-payment flow itself with a lower value.
    public decimal MaxPaymentLinkAmount { get; set; } = 50000m;
}
