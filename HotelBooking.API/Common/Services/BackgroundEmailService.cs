using System;
using System.Threading.Channels;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Threading;

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

public class BackgroundEmailService : BackgroundService
{
    private readonly BackgroundEmailQueue _queue;
    private readonly IEmailSender _emailSender;
    private readonly ILogger<BackgroundEmailService> _logger;

    private const int MaxAttempts = 3;
    private readonly TimeSpan _retryDelay;

    public BackgroundEmailService(BackgroundEmailQueue queue, IEmailSender emailSender, ILogger<BackgroundEmailService> logger)
        : this(queue, emailSender, logger, TimeSpan.FromSeconds(5))
    {
    }

    // Lets tests use a near-zero delay instead of waiting out the real production backoff — the DI
    // container can't resolve a bare TimeSpan, so it always picks the 3-arg constructor above.
    public BackgroundEmailService(BackgroundEmailQueue queue, IEmailSender emailSender, ILogger<BackgroundEmailService> logger, TimeSpan retryDelay)
    {
        _queue = queue;
        _emailSender = emailSender;
        _logger = logger;
        _retryDelay = retryDelay;
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
                return;
            }
        }
    }
}
