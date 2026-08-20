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
    private readonly HotelBooking.API.Common.Services.IReconciliationHealthTracker _healthTracker;

    // QA fix: the Angular payment-portal's own status poll (GET /api/razorpay/status/{reference})
    // gives up after ~3 minutes (see MAX_POLL_ATTEMPTS in payment-portal.component.ts) if the
    // booking is still "Created". In any environment where Razorpay's webhook cannot reach this
    // API directly (e.g. a local dev backend with no public tunnel), this reconciliation pass was
    // the ONLY other path to "Paid" — but at 20 minutes stale / 5 minute intervals, it could never
    // run soon enough for the frontend's poll to ever observe the result, so a genuinely completed
    // payment looked stuck on the waiting screen forever. Tightened so a missed webhook is
    // reconciled well within the frontend's existing polling window instead of loosening that
    // window or adding a second, duplicate poll loop.
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan StaleThreshold = TimeSpan.FromSeconds(60);

    // Without an upper bound, every abandoned/never-paid "Created" link ever created (test links,
    // links for bookings the customer gave up on) stays in the reconciliation query forever, so the
    // backlog only grows over the life of the app — and every record in it gets re-hit on every
    // single 30s tick. That's what was bursting dozens of individual Razorpay calls per tick and
    // tripping its 429 rate limit, which shares the same API key/HttpClient as the customer-facing
    // payment-link creation call. Past this age, a link is abandoned, not "about to complete late" —
    // stop re-checking it.
    private static readonly TimeSpan MaxReconciliationAge = TimeSpan.FromHours(3);

    // Spaces out the individual per-record Razorpay calls within one pass so N stale records never
    // become a burst of N near-simultaneous requests against the same rate limit.
    private static readonly TimeSpan InterCallDelay = TimeSpan.FromMilliseconds(400);

    public PaymentReconciliationService(IServiceScopeFactory scopeFactory, ILogger<PaymentReconciliationService> logger,
        HotelBooking.API.Common.Services.IReconciliationHealthTracker healthTracker)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _healthTracker = healthTracker;
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

                // Heartbeat Pattern - marks this tick as successfully completed so the /health check can tell a wedged/crashed loop apart from a merely-idle one.
                _healthTracker.RecordSuccess();
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
        var maxAgeCutoff = DateTime.UtcNow - MaxReconciliationAge;
        var staleRecords = await context.RazorpayPayments
            .Where(r => r.Status == "Created" && r.RazorpayPaymentLinkId != null
                        && r.CreatedAt < cutoff && r.CreatedAt >= maxAgeCutoff)
            .ToListAsync(stoppingToken);

        // Reconciliation Gap Fix — HandleWebhookEventAsync marks a RazorpayPayment "Paid" and saves
        // BEFORE calling ConfirmLinkedBookingIfAnyAsync, so if that later confirmation step fails
        // (e.g. a transient DB error), the payment is stuck "Paid" while its linked Booking never
        // gets confirmed — and the query above (Status == "Created") never catches it since it's
        // already "Paid". Separately finds any "Paid" record whose linked Booking isn't yet
        // Confirmed/Cancelled and re-invokes the (idempotent) confirmation for it.
        var unconfirmedPaidRecords = await context.RazorpayPayments
            .Where(r => r.Status == "Paid" && r.BookingId != null
                        && r.CreatedAt >= maxAgeCutoff)
            .Join(context.Bookings,
                r => r.BookingId!.Value,
                b => b.Id,
                (r, b) => new { Payment = r, BookingStatus = b.Status })
            .Where(x => x.BookingStatus != "Confirmed" && x.BookingStatus != "Cancelled")
            .Select(x => x.Payment)
            .ToListAsync(stoppingToken);

        foreach (var paidRecord in unconfirmedPaidRecords)
        {
            try
            {
                _logger.LogInformation("Reconciliation: retrying stuck confirmation for reference {Reference} (Paid but Booking not confirmed).", paidRecord.Reference);
                await paymentService.RetryConfirmationForPaidPaymentAsync(paidRecord.Reference);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retry confirmation for stuck-paid Razorpay reference {Reference}.", paidRecord.Reference);
            }
        }

        if (staleRecords.Count == 0)
            return;

        _logger.LogInformation("Reconciling {Count} stale Razorpay payment link(s).", staleRecords.Count);

        var isFirst = true;
        foreach (var record in staleRecords)
        {
            if (!isFirst)
                await Task.Delay(InterCallDelay, stoppingToken);
            isFirst = false;

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
            catch (InvalidOperationException ex) when (ex.Message.Contains("(429)"))
            {
                // Razorpay is already rate-limiting this API key — stop this pass immediately
                // instead of ploughing through the rest of the backlog and making it worse. The
                // remaining records just get picked up on the next tick.
                _logger.LogWarning("Razorpay rate limit hit while reconciling {Reference} — stopping this pass early.", record.Reference);
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to reconcile Razorpay payment reference {Reference}.", record.Reference);
            }
        }
    }
}
