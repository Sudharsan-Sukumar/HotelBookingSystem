using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using HotelBooking.API.Common.Services;
using Microsoft.Extensions.Logging.Abstractions;
using NUnit.Framework;

namespace HotelBooking.Tests.Common;

internal class FakeEmailSender : IEmailSender
{
    public List<EmailPayload> Attempts { get; } = new();
    public int FailuresBeforeSuccess { get; set; }
    public bool AlwaysFail { get; set; }

    public Task SendAsync(EmailPayload payload, CancellationToken cancellationToken)
    {
        Attempts.Add(payload);

        if (AlwaysFail || Attempts.Count <= FailuresBeforeSuccess)
            throw new InvalidOperationException("Simulated SMTP failure.");

        return Task.CompletedTask;
    }
}

[TestFixture]
public class BackgroundEmailServiceTests
{
    private static async Task WaitUntilAsync(Func<bool> condition, int timeoutMs = 3000)
    {
        var elapsed = 0;
        while (!condition() && elapsed < timeoutMs)
        {
            await Task.Delay(25);
            elapsed += 25;
        }
    }

    [Test]
    public async Task SendWithRetry_TransientFailureThenSuccess_RetriesAndEventuallySucceeds()
    {
        var queue = new BackgroundEmailQueue();
        var sender = new FakeEmailSender { FailuresBeforeSuccess = 1 }; // fails once, succeeds on 2nd attempt
        var service = new BackgroundEmailService(queue, sender, NullLogger<BackgroundEmailService>.Instance, TimeSpan.FromMilliseconds(20));

        await service.StartAsync(CancellationToken.None);
        await queue.QueueEmailAsync(new EmailPayload { To = "customer@hbs.local", Subject = "Booking Confirmation" });

        await WaitUntilAsync(() => sender.Attempts.Count >= 2, timeoutMs: 10000);
        await service.StopAsync(CancellationToken.None);
        service.Dispose();

        Assert.That(sender.Attempts, Has.Count.EqualTo(2)); // 1 failure + 1 success, not a bare single attempt
    }

    [Test]
    public async Task SendWithRetry_PermanentFailure_GivesUpAfterMaxAttemptsWithoutCrashingTheLoop()
    {
        var queue = new BackgroundEmailQueue();
        var sender = new FakeEmailSender { AlwaysFail = true };
        var service = new BackgroundEmailService(queue, sender, NullLogger<BackgroundEmailService>.Instance, TimeSpan.FromMilliseconds(20));

        await service.StartAsync(CancellationToken.None);
        await queue.QueueEmailAsync(new EmailPayload { To = "customer@hbs.local", Subject = "Booking Confirmation" });
        await queue.QueueEmailAsync(new EmailPayload { To = "another@hbs.local", Subject = "Second email" });

        // 3 attempts for the first (permanently failing) email, then the loop must move on to the second.
        await WaitUntilAsync(() => sender.Attempts.Count >= 6, timeoutMs: 15000);
        await service.StopAsync(CancellationToken.None);
        service.Dispose();

        Assert.That(sender.Attempts, Has.Count.EqualTo(6)); // 3 attempts each, loop never got stuck/crashed
    }
}
