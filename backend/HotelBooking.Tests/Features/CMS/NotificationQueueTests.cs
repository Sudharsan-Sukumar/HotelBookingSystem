using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Models;
using HotelBooking.API.Features.CMS.Services;
using HotelBooking.API.Users.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using NUnit.Framework;

namespace HotelBooking.Tests.Features.CMS;

// Wraps the real NotificationService but throws for any message containing "FAIL", to prove a
// single processing failure doesn't crash the background loop or block later queued items.
internal class ThrowingNotificationService : INotificationService
{
    private readonly NotificationService _inner;
    public ThrowingNotificationService(ApplicationDbContext context) => _inner = new NotificationService(context);

    public Task<IEnumerable<Notification>> GetUserNotificationsAsync(int userId) => _inner.GetUserNotificationsAsync(userId);

    public Task<Notification> SendNotificationAsync(NotificationRequestDto dto)
    {
        if (dto.Message.Contains("FAIL"))
            throw new InvalidOperationException("Simulated notification-processing failure.");
        return _inner.SendNotificationAsync(dto);
    }

    public Task<bool> MarkAsReadAsync(int notificationId, int userId) => _inner.MarkAsReadAsync(notificationId, userId);
    public Task<int> MarkAllAsReadAsync(int userId) => _inner.MarkAllAsReadAsync(userId);
    public Task<bool> DeleteNotificationAsync(int notificationId, int userId) => _inner.DeleteNotificationAsync(notificationId, userId);
}

[TestFixture]
public class NotificationQueueTests
{
    private ApplicationDbContext _context = null!;
    private BackgroundNotificationQueue _queue = null!;
    private BackgroundNotificationService _backgroundService = null!;
    private ServiceProvider _provider = null!;
    private User _user = null!;

    [SetUp]
    public void SetUp()
    {
        var dbName = Guid.NewGuid().ToString();

        var services = new ServiceCollection();
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseInMemoryDatabase(dbName)
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning)));
        services.AddScoped<INotificationService, ThrowingNotificationService>();
        _provider = services.BuildServiceProvider();

        _context = _provider.GetRequiredService<ApplicationDbContext>();

        _queue = new BackgroundNotificationQueue();
        _backgroundService = new BackgroundNotificationService(
            _queue, _provider.GetRequiredService<IServiceScopeFactory>(), NullLogger<BackgroundNotificationService>.Instance);

        _context.Roles.Add(new API.Users.Models.Role { Id = 2, Name = "Customer" });
        _user = new User
        {
            FirstName = "Notify",
            LastName = "Tester",
            Email = "notifytester@hbs.local",
            Phone = "9876500000",
            PasswordHash = "irrelevant",
            RoleId = 2,
            Status = "Active"
        };
        _context.Users.Add(_user);
        _context.SaveChanges();
    }

    [TearDown]
    public void TearDown()
    {
        _backgroundService.Dispose();
        _context.Dispose();
        _provider.Dispose();
    }

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
    public async Task QueuedNotification_IsProcessedInBackgroundAndPersisted()
    {
        await _backgroundService.StartAsync(CancellationToken.None);

        await _queue.QueueNotificationAsync(new NotificationRequestDto
        {
            UserId = _user.Id,
            Message = "Your booking BKG-2026-000001 is confirmed.",
            Type = "BookingConfirmed"
        });

        await WaitUntilAsync(() => _context.Notifications.Any(n => n.UserId == _user.Id));
        await _backgroundService.StopAsync(CancellationToken.None);

        var stored = _context.Notifications.First(n => n.UserId == _user.Id);
        Assert.That(stored.Type, Is.EqualTo("BookingConfirmed"));
        Assert.That(stored.IsRead, Is.False);
        Assert.That(stored.Message, Does.Contain("BKG-2026-000001"));
    }

    [Test]
    public async Task ProcessingFailure_DoesNotStopSubsequentNotificationsFromBeingPersisted()
    {
        await _backgroundService.StartAsync(CancellationToken.None);

        // First item is engineered to throw during processing; second is a normal, valid item.
        await _queue.QueueNotificationAsync(new NotificationRequestDto { UserId = _user.Id, Message = "FAIL this one", Type = "Info" });
        await _queue.QueueNotificationAsync(new NotificationRequestDto { UserId = _user.Id, Message = "This one should still succeed.", Type = "Info" });

        await WaitUntilAsync(() => _context.Notifications.Any(n => n.Message.Contains("still succeed")));
        await _backgroundService.StopAsync(CancellationToken.None);

        // The failure never persisted...
        Assert.That(_context.Notifications.Any(n => n.Message.Contains("FAIL")), Is.False);
        // ...but the loop kept running and processed the next item regardless.
        Assert.That(_context.Notifications.Any(n => n.Message.Contains("still succeed")), Is.True);
    }
}
