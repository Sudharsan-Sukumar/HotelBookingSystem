using System;
using System.Threading.Channels;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Threading;
using HotelBooking.API.Data;
using HotelBooking.API.Common.Models;

namespace HotelBooking.API.Common.Services;

public class EmailPayload
{
    public string To { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
}

public interface IEmailQueue
{
    ValueTask QueueEmailAsync(EmailPayload payload);
}

// Producer-Consumer Pattern — a bounded Channel decouples request threads (producers) enqueuing emails from the background worker (consumer) that sends them.
public class BackgroundEmailQueue : IEmailQueue
{
    private readonly Channel<EmailPayload> _queue;

    public BackgroundEmailQueue()
    {
        var options = new BoundedChannelOptions(100)
        {
            FullMode = BoundedChannelFullMode.Wait
        };
        _queue = Channel.CreateBounded<EmailPayload>(options);
    }

    public async ValueTask QueueEmailAsync(EmailPayload payload)
    {
        await _queue.Writer.WriteAsync(payload);
    }

    public ChannelReader<EmailPayload> Reader => _queue.Reader;
}

// Separated from BackgroundEmailService so the actual "send" mechanics (today: simulated; later:
// real SMTP/SendGrid/etc.) can change without touching the queue-draining/retry loop, and so tests
// can inject a sender that deterministically fails to exercise the retry path.
public interface IEmailSender
{
    Task SendAsync(EmailPayload payload, CancellationToken cancellationToken);
}

public class SimulatedEmailSender : IEmailSender
{
    public async Task SendAsync(EmailPayload payload, CancellationToken cancellationToken)
    {
        // Simulate SMTP delay. No real mail provider is wired up yet — swap this class out for a
        // real one (SMTP/SendGrid/etc.) without touching BackgroundEmailService's retry logic below.
        await Task.Delay(1000, cancellationToken);
    }
}

// Producer-Consumer Pattern — hosted BackgroundService consumer that drains BackgroundEmailQueue outside the request thread.
public class BackgroundEmailService : BackgroundService
{
    private readonly BackgroundEmailQueue _queue;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<BackgroundEmailService> _logger;
    private readonly IServiceScopeFactory? _scopeFactory;

    private const int MaxAttempts = 3;
    private readonly TimeSpan _retryDelay;

    public BackgroundEmailService(BackgroundEmailQueue queue, IEmailSender emailSender, ILogger<BackgroundEmailService> logger,
        IServiceScopeFactory scopeFactory)
        : this(queue, emailSender, logger, TimeSpan.FromSeconds(5), scopeFactory)
    {
    }

    // Lets tests use a near-zero delay instead of waiting out the real production backoff — the DI
    // container can't resolve a bare TimeSpan, so it always picks the 4-arg constructor above.
    // scopeFactory is optional (defaults to null) so existing in-memory-fake-based tests that don't
    // care about dead-lettering can keep constructing this without a DI container.
    public BackgroundEmailService(BackgroundEmailQueue queue, IEmailSender emailSender, ILogger<BackgroundEmailService> logger, TimeSpan retryDelay,
        IServiceScopeFactory? scopeFactory = null)
    {
        _queue = queue;
        _emailSender = emailSender;
        _logger = logger;
        _retryDelay = retryDelay;
        _scopeFactory = scopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Background Email Service is starting.");

        await foreach (var payload in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            await SendWithRetryAsync(payload, stoppingToken);
        }
    }

    // Customer Edge Case #5: "Booking confirmed but email sending fails" — retries with backoff
    // instead of a bare best-effort attempt, so a transient SMTP failure doesn't just silently drop
    // the email. A permanent failure after MaxAttempts is logged (console-only — technical, not a
    // business audit event) and the loop moves on; it never affects the booking that already
    // committed before this email was queued.
    private async Task SendWithRetryAsync(EmailPayload payload, CancellationToken stoppingToken)
    {
        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            try
            {
                _logger.LogInformation("Sending email to {To} with subject: {Subject} (attempt {Attempt}/{MaxAttempts}).",
                    payload.To, payload.Subject, attempt, MaxAttempts);

                await _emailSender.SendAsync(payload, stoppingToken);

                _logger.LogInformation("Successfully sent email to {To}.", payload.To);
                return;
            }
            catch (Exception ex) when (attempt < MaxAttempts)
            {
                _logger.LogWarning(ex, "Failed to send email to {To} on attempt {Attempt}/{MaxAttempts} — retrying in {Delay}.",
                    payload.To, attempt, MaxAttempts, _retryDelay);
                await Task.Delay(_retryDelay, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to {To} after {MaxAttempts} attempts — giving up.",
                    payload.To, MaxAttempts);

                // Dead-Letter Pattern - persists the exhausted email as a durable, inspectable row instead of only a console log line that scrolls away.
                await PersistFailedEmailAsync(payload, ex, stoppingToken);
                return;
            }
        }
    }

    private async Task PersistFailedEmailAsync(EmailPayload payload, Exception ex, CancellationToken stoppingToken)
    {
        if (_scopeFactory == null)
            return;

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            context.FailedEmails.Add(new FailedEmail
            {
                To = payload.To,
                Subject = payload.Subject,
                Body = payload.Body,
                FailureReason = ex.Message,
                FailedAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync(stoppingToken);
        }
        catch (Exception persistEx)
        {
            _logger.LogError(persistEx, "Failed to persist dead-letter record for email to {To}.", payload.To);
        }
    }
}
