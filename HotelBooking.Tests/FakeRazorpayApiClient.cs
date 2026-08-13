using System.Threading.Tasks;
using HotelBooking.API.Features.Payments.Services;

namespace HotelBooking.Tests;

internal class FakeRazorpayApiClient : IRazorpayApiClient
{
    public string? LastReferenceId { get; private set; }
    public int CallCount { get; private set; }
    public string StatusToReturn { get; set; } = "paid";

    public Task<RazorpayPaymentLinkResult> CreatePaymentLinkAsync(long amountPaise, string currency, string referenceId, string phoneNumber, string description)
    {
        LastReferenceId = referenceId;
        CallCount++;
        return Task.FromResult(new RazorpayPaymentLinkResult
        {
            PaymentLinkId = "plink_fake_" + referenceId,
            ShortUrl = "https://rzp.io/rzp/fake"
        });
    }

    public int StatusCheckCallCount { get; private set; }

    public Task<string> GetPaymentLinkStatusAsync(string paymentLinkId)
    {
        StatusCheckCallCount++;
        return Task.FromResult(StatusToReturn);
    }
}
