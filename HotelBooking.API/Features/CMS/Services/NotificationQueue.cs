using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;
using HotelBooking.API.Features.CMS.DTOs;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HotelBooking.API.Features.CMS.Services;

// Mirrors the BackgroundEmailQueue/BackgroundEmailService pattern in Common/Services: an in-memory
// Channel-based queue plus a BackgroundService that drains it. Callers only ever write to the
// channel (fast, in-memory, never touches the DB), so the request that triggered a notification
// returns immediately — actual persistence happens later, off the request thread.
public interface INotificationQueue
{
    ValueTask QueueNotificationAsync(NotificationRequestDto dto);
}

public class BackgroundNotificationQueue : INotificationQueue
{
    private readonly Channel<NotificationRequestDto> _queue;

    public BackgroundNotificationQueue()
    {
        var options = new BoundedChannelOptions(500)
        {
            FullMode = BoundedChannelFullMode.Wait
        };
        _queue = Channel.CreateBounded<NotificationRequestDto>(options);
    }

    public async ValueTask QueueNotificationAsync(NotificationRequestDto dto)
    {
        await _queue.Writer.WriteAsync(dto);
    }

    public ChannelReader<NotificationRequestDto> Reader => _queue.Reader;
}

public class BackgroundNotificationService : BackgroundService
{
    private readonly BackgroundNotificationQueue _queue;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BackgroundNotificationService> _logger;

    public BackgroundNotificationService(BackgroundNotificationQueue queue, IServiceScopeFactory scopeFactory,
        ILogger<BackgroundNotificationService> logger)
    {
        _queue = queue;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Background Notification Service is starting.");

        await foreach (var dto in _queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                // BackgroundService is a singleton; INotificationService depends on the scoped
                // ApplicationDbContext, so each queued item is processed in its own DI scope.
                using var scope = _scopeFactory.CreateScope();
                var notificationService = scope.ServiceProvider.GetRequiredService<INotificationService>();
                await notificationService.SendNotificationAsync(dto);
            }
            catch (Exception ex)
            {
                // A notification-processing failure must never propagate back to the business
                // operation that queued it — that request already completed and returned. Log and
                // move on to the next queued item.
                _logger.LogError(ex, "Failed to process queued notification for UserId={UserId}.", dto.UserId);
            }
        }
    }
}
