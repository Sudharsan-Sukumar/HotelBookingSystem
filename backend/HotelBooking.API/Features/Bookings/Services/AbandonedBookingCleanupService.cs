using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Services;
using HotelBooking.API.Users.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HotelBooking.API.Features.Bookings.Services;

// Customer/Business Edge Case: "Abandoned payment session never expires the booking lock." A
// booking left in "Pending Payment"/"Pending Additional Payment" whose PaymentSessionExpiresAt has
// passed currently blocks Modify/Cancel forever (ModifyBookingAsync/CancelBookingAsync both reject
// while a payment is "in flight", and nothing else ever flips the status away from it). Mirrors the
// polling-loop/DI-scope-per-tick structure of BackgroundEmailService/PaymentReconciliationService,
// since a Scoped DbContext needs a fresh scope every tick, not one held for the hosted service's
// whole lifetime.
public class AbandonedBookingCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AbandonedBookingCleanupService> _logger;

    private static readonly TimeSpan PollInterval = TimeSpan.FromMinutes(10);

    // RazorpayPaymentService.CreatePaymentLinkAsync renews (rather than rejects) an expired payment
    // session the moment the customer retries paying — so a grace buffer here must stay well clear
    // of that renewal window, or this cleanup could race a customer who is mid-retry and cancel a
    // booking they were actively about to pay for. Booking.PaymentSessionMinutes is 15; using 2x that
    // (30 minutes) as the buffer on top of the expiry timestamp gives ample room for a same-session
    // retry to have already renewed the expiry before this job would ever consider the booking abandoned.
    private static readonly TimeSpan GraceBuffer = TimeSpan.FromMinutes(30);

    private static readonly string[] PaymentInFlightStatuses = { "Pending Payment", "Pending Additional Payment" };

    public AbandonedBookingCleanupService(IServiceScopeFactory scopeFactory, ILogger<AbandonedBookingCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Abandoned Booking Cleanup Service is starting.");

        using var timer = new PeriodicTimer(PollInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await CleanupOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                // A cleanup-pass failure must never crash the background loop — log and retry next tick.
                _logger.LogError(ex, "Abandoned booking cleanup pass failed.");
            }
        }
    }

    private async Task CleanupOnceAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var auditLogService = scope.ServiceProvider.GetRequiredService<IAuditLogService>();
        var notificationQueue = scope.ServiceProvider.GetRequiredService<INotificationQueue>();

        var cutoff = DateTime.UtcNow - GraceBuffer;

        // Abandoned Payment-Session Query - finds bookings whose payment session lapsed well past the renew-on-retry window, so they're genuinely abandoned rather than mid-retry.
        var abandonedBookings = await context.Bookings
            .Where(b => PaymentInFlightStatuses.Contains(b.Status) &&
                        b.PaymentSessionExpiresAt.HasValue &&
                        b.PaymentSessionExpiresAt.Value < cutoff)
            .ToListAsync(stoppingToken);

        if (abandonedBookings.Count == 0)
            return;

        _logger.LogInformation("Auto-cancelling {Count} abandoned payment-session booking(s).", abandonedBookings.Count);

        foreach (var booking in abandonedBookings)
        {
            try
            {
                var label = string.IsNullOrEmpty(booking.BookingCustomId) ? $"#{booking.Id}" : booking.BookingCustomId;

                booking.Status = "Cancelled";
                booking.CancelledAt = DateTime.UtcNow;
                await context.SaveChangesAsync(stoppingToken);

                // Never paid — no refund/wallet credit, matching CancelBookingAsync's own "wasPaid" logic for unpaid bookings.
                await auditLogService.LogActionAsync(
                    "Booking", booking.Id, "AutoCancel",
                    $"Booking {label} automatically cancelled: payment session expired and was never completed. No refund due (booking was never paid).",
                    booking.UserId);

                await notificationQueue.QueueNotificationAsync(new NotificationRequestDto
                {
                    UserId = booking.UserId,
                    Message = $"Your booking {label} was automatically cancelled because its payment session expired without completing payment.",
                    Type = "BookingAutoCancelled"
                });
            }
            catch (Exception ex)
            {
                // One booking's cleanup failing must not stop the rest of the batch — log and move on.
                _logger.LogError(ex, "Failed to auto-cancel abandoned booking {BookingId}.", booking.Id);
            }
        }
    }
}
