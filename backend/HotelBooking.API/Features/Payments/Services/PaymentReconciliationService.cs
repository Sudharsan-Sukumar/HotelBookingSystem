using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HotelBooking.API.Features.Payments.Services;

// Customer Edge Case #4: "Payment succeeds but Booking API crashes." The primary confirmation path
// is Razorpay's webhook (PaymentWebhookController), but a webhook delivery can be missed or the
// server can crash between capturing payment and processing it. This background job periodically
// re-checks any Razorpay payment link that's been sitting in "Created" status for longer than a
// normal payment session should take, and reconciles it directly against Razorpay's own status —
// catching money that was actually captured but never confirmed locally.
public class PaymentReconciliationService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<PaymentReconciliationService> _logger;

    private static readonly TimeSpan PollInterval = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan StaleThreshold = TimeSpan.FromMinutes(20);

    public PaymentReconciliationService(IServiceScopeFactory scopeFactory, ILogger<PaymentReconciliationService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Payment Reconciliation Service is starting.");

        using var timer = new PeriodicTimer(PollInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await ReconcileOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                // A reconciliation-pass failure must never crash the background loop — log and
                // retry on the next tick.
                _logger.LogError(ex, "Payment reconciliation pass failed.");
            }
        }
    }

    private async Task ReconcileOnceAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var razorpayClient = scope.ServiceProvider.GetRequiredService<IRazorpayApiClient>();
        var paymentService = scope.ServiceProvider.GetRequiredService<IRazorpayPaymentService>();

        var cutoff = DateTime.UtcNow - StaleThreshold;
        var staleRecords = await context.RazorpayPayments
            .Where(r => r.Status == "Created" && r.CreatedAt < cutoff && r.RazorpayPaymentLinkId != null)
            .ToListAsync(stoppingToken);

        if (staleRecords.Count == 0)
            return;

        _logger.LogInformation("Reconciling {Count} stale Razorpay payment link(s).", staleRecords.Count);

        foreach (var record in staleRecords)
        {
            try
            {
                var status = await razorpayClient.GetPaymentLinkStatusAsync(record.RazorpayPaymentLinkId!);
                _logger.LogInformation("Reconciliation: reference {Reference} is '{Status}' at Razorpay.", record.Reference, status);

                switch (status)
                {
                    case "paid":
                        // Reuses the exact same confirmation path the webhook would have taken —
                        // idempotent by design (HandleWebhookEventAsync no-ops if already "Paid").
                        await paymentService.HandleWebhookEventAsync("payment_link.paid", null, null, record.Reference);
                        break;
                    case "expired":
                    case "cancelled":
                        await paymentService.HandleWebhookEventAsync("payment_link.expired", null, $"Reconciled as {status}.", record.Reference);
                        break;
                    // "created"/"partially_paid" — still genuinely pending, nothing to reconcile yet.
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to reconcile Razorpay payment reference {Reference}.", record.Reference);
            }
        }
    }
}
