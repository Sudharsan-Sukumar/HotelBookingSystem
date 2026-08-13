using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using HotelBooking.API.Features.Payments.DTOs;
using HotelBooking.API.Features.Payments.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace HotelBooking.API.Features.Payments.Controllers;

[ApiController]
[Route("api/webhooks")]
[ApiExplorerSettings(IgnoreApi = true)] // Hide from normal Swagger docs
public class PaymentWebhookController : ControllerBase
{
    private readonly ILogger<PaymentWebhookController> _logger;
    private readonly IRazorpayPaymentService _razorpayPaymentService;
    private readonly RazorpayOptions _razorpayOptions;

    public PaymentWebhookController(
        ILogger<PaymentWebhookController> logger,
        IRazorpayPaymentService razorpayPaymentService,
        IOptions<RazorpayOptions> razorpayOptions)
    {
        _logger = logger;
        _razorpayPaymentService = razorpayPaymentService;
        _razorpayOptions = razorpayOptions.Value;
    }

    [HttpPost("razorpay")]
    public async Task<IActionResult> HandleRazorpayWebhook()
    {
        string rawBody;
        using (var reader = new StreamReader(Request.Body))
        {
            rawBody = await reader.ReadToEndAsync();
        }

        if (!Request.Headers.TryGetValue("X-Razorpay-Signature", out var signatureHeader) || string.IsNullOrEmpty(signatureHeader))
        {
            _logger.LogWarning("Razorpay webhook received without a signature header.");
            return Unauthorized(new { message = "Missing signature." });
        }

        var expectedSignature = RazorpayPaymentService.ComputeHmacSha256Hex(rawBody, _razorpayOptions.WebhookSecret);

        if (!CryptographicallyEqual(expectedSignature, signatureHeader.ToString()))
        {
            _logger.LogWarning("Razorpay webhook signature verification failed.");
            return Unauthorized(new { message = "Invalid signature." });
        }

        using var doc = JsonDocument.Parse(rawBody);
        var root = doc.RootElement;

        var eventType = root.TryGetProperty("event", out var eventEl) ? eventEl.GetString() ?? "" : "";
        string? paymentId = null;
        string? errorDescription = null;
        string? referenceId = null;

        if (root.TryGetProperty("payload", out var payload))
        {
            if (payload.TryGetProperty("payment", out var paymentEntityWrapper) &&
                paymentEntityWrapper.TryGetProperty("entity", out var paymentEntity))
            {
                paymentId = paymentEntity.TryGetProperty("id", out var pid) ? pid.GetString() : null;
                errorDescription = paymentEntity.TryGetProperty("error_description", out var err) ? err.GetString() : null;
            }

            // Payment Links webhooks carry the merchant-supplied reference_id here, which is how
            // we correlate back to our RazorpayPayment row (we only ever create Payment Links now,
            // never Orders, so this is the sole correlation key).
            if (payload.TryGetProperty("payment_link", out var linkEntityWrapper) &&
                linkEntityWrapper.TryGetProperty("entity", out var linkEntity))
            {
                referenceId = linkEntity.TryGetProperty("reference_id", out var refId) ? refId.GetString() : null;
            }
        }

        _logger.LogInformation("Razorpay webhook received: {Event} for reference {ReferenceId}", eventType, referenceId);

        if (!string.IsNullOrEmpty(referenceId))
        {
            await _razorpayPaymentService.HandleWebhookEventAsync(eventType, paymentId, errorDescription, referenceId);
        }

        return Ok(new { message = "Webhook processed." });
    }

    private static bool CryptographicallyEqual(string a, string b)
    {
        var bytesA = System.Text.Encoding.UTF8.GetBytes(a);
        var bytesB = System.Text.Encoding.UTF8.GetBytes(b);
        return bytesA.Length == bytesB.Length && System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(bytesA, bytesB);
    }
}
