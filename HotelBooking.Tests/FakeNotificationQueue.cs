using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Services;

namespace HotelBooking.Tests;

internal class FakeNotificationQueue : INotificationQueue
{
    public List<NotificationRequestDto> Queued { get; } = new();

    public ValueTask QueueNotificationAsync(NotificationRequestDto dto)
    {
        Queued.Add(dto);
        return ValueTask.CompletedTask;
    }
}
