using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace HotelBooking.API.Common.Services;

// Real SMTP delivery via Brevo (or any SMTP relay) — replaces SimulatedEmailSender so OTP/
// verification/reset emails actually reach the customer's inbox for a live demo instead of only
// existing as a DB column. BackgroundEmailService's queue-drain/retry loop is untouched: this only
// swaps what happens inside SendAsync, exactly the seam Common/Services/BackgroundEmailService.cs's
// IEmailSender interface was already designed for.
public class SmtpEmailSender : IEmailSender
{
    private readonly SmtpOptions _options;
    private readonly ILogger<SmtpEmailSender> _logger;

    public SmtpEmailSender(IOptions<SmtpOptions> options, ILogger<SmtpEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(EmailPayload payload, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.Host) || string.IsNullOrWhiteSpace(_options.Login) || string.IsNullOrWhiteSpace(_options.Password))
        {
            // Fails loudly (caught by BackgroundEmailService's existing retry/log-and-give-up
            // logic) instead of silently pretending to send — a missing SMTP config should never
            // look like a successfully delivered OTP email.
            throw new InvalidOperationException(
                "SMTP is not configured (Smtp:Host/Smtp:Login/Smtp:Password). Set them via User Secrets or environment variables — see README.");
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_options.FromName, _options.FromEmail));
        message.To.Add(MailboxAddress.Parse(payload.To));
        message.Subject = payload.Subject;
        message.Body = new TextPart("plain") { Text = payload.Body };

        using var client = new SmtpClient();

        // Never log payload.Body anywhere in this method — it's the only place an OTP exists
        // outside the database, and this class's own log lines must stay safe to ship as-is.
        _logger.LogInformation("Connecting to SMTP host {Host}:{Port} to send to {To}.", _options.Host, _options.Port, payload.To);

        await client.ConnectAsync(_options.Host, _options.Port, SecureSocketOptions.StartTls, cancellationToken);
        await client.AuthenticateAsync(_options.Login, _options.Password, cancellationToken);
        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);
    }
}
