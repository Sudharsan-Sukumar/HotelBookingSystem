using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Polly.CircuitBreaker;

namespace HotelBooking.API.Features.Payments.Services;

public interface IRazorpayApiClient
{
    Task<RazorpayPaymentLinkResult> CreatePaymentLinkAsync(long amountPaise, string currency, string referenceId, string phoneNumber, string description);

    // Returns Razorpay's own "status" field for a Payment Link (e.g. "created", "paid", "expired",
    // "cancelled") — used by the reconciliation background job to catch payments that succeeded but
    // whose webhook was never delivered (Customer Edge Case #4).
    Task<string> GetPaymentLinkStatusAsync(string paymentLinkId);
}

// Thrown when Razorpay is unreachable (network failure or the Polly circuit breaker has tripped
// after repeated failures) so callers can fall back to a friendly "try again shortly" response
// instead of surfacing a raw HTTP/transport error.
public class RazorpayUnavailableException : Exception
{
    public RazorpayUnavailableException(string message, Exception? inner = null) : base(message, inner) { }
}

// Thrown specifically on a 401/403 from Razorpay — this is never transient (retrying won't help),
// it means the configured Key ID/Secret are wrong, revoked, or still placeholder values. Kept
// distinct from RazorpayUnavailableException so callers can tell "gateway is down, retry later"
// apart from "this deployment's credentials are broken, an operator needs to fix .env".
public class RazorpayConfigurationException : Exception
{
    public RazorpayConfigurationException(string message) : base(message) { }
}

public class RazorpayPaymentLinkResult
{
    public string PaymentLinkId { get; set; } = string.Empty;
    public string ShortUrl { get; set; } = string.Empty;
}

public class RazorpayApiClient : IRazorpayApiClient
{
    private readonly HttpClient _httpClient;
    private readonly RazorpayOptions _options;

    private string MaskedKeyId => string.IsNullOrEmpty(_options.KeyId)
        ? "(empty)"
        : _options.KeyId.Length <= 12 ? _options.KeyId : _options.KeyId[..12] + "...";

    public RazorpayApiClient(HttpClient httpClient, IOptions<RazorpayOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;

        _httpClient.BaseAddress = new Uri("https://api.razorpay.com/v1/");
        var basicAuth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_options.KeyId}:{_options.KeySecret}"));
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", basicAuth);
    }

    public async Task<RazorpayPaymentLinkResult> CreatePaymentLinkAsync(long amountPaise, string currency, string referenceId, string phoneNumber, string description)
    {
        var payload = new
        {
            amount = amountPaise,
            currency,
            reference_id = referenceId,
            description,
            customer = new { contact = $"+91{phoneNumber}" },
            notify = new { sms = true, email = false },
            reminder_enable = true
        };

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.PostAsJsonAsync("payment_links", payload);
        }
        catch (BrokenCircuitException ex)
        {
            throw new RazorpayUnavailableException("Payment gateway is temporarily unavailable after repeated failures. Please try again in a minute.", ex);
        }
        catch (HttpRequestException ex)
        {
            throw new RazorpayUnavailableException("Could not reach the payment gateway. Please try again shortly.", ex);
        }

        var body = await response.Content.ReadAsStringAsync();

        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized || response.StatusCode == System.Net.HttpStatusCode.Forbidden)
        {
            throw new RazorpayConfigurationException(
                $"Razorpay rejected the configured API credentials (KeyId starting '{MaskedKeyId}'). " +
                "This is a configuration problem, not a transient failure — verify Razorpay:KeyId/KeySecret in .env " +
                "against a live key from the Razorpay Dashboard (Settings > API Keys).");
        }

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Razorpay payment link creation failed ({(int)response.StatusCode}): {body}");
        }

        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        return new RazorpayPaymentLinkResult
        {
            PaymentLinkId = root.GetProperty("id").GetString() ?? string.Empty,
            ShortUrl = root.GetProperty("short_url").GetString() ?? string.Empty
        };
    }

    public async Task<string> GetPaymentLinkStatusAsync(string paymentLinkId)
    {
        HttpResponseMessage response;
        try
        {
            response = await _httpClient.GetAsync($"payment_links/{paymentLinkId}");
        }
        catch (BrokenCircuitException ex)
        {
            throw new RazorpayUnavailableException("Payment gateway is temporarily unavailable after repeated failures. Please try again in a minute.", ex);
        }
        catch (HttpRequestException ex)
        {
            throw new RazorpayUnavailableException("Could not reach the payment gateway. Please try again shortly.", ex);
        }

        var body = await response.Content.ReadAsStringAsync();

        if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized || response.StatusCode == System.Net.HttpStatusCode.Forbidden)
        {
            throw new RazorpayConfigurationException(
                $"Razorpay rejected the configured API credentials (KeyId starting '{MaskedKeyId}').");
        }

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Razorpay payment link status check failed ({(int)response.StatusCode}): {body}");
        }

        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.GetProperty("status").GetString() ?? "unknown";
    }
}
