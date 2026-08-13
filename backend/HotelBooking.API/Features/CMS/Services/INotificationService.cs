using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Models;

namespace HotelBooking.API.Features.CMS.Services;

public interface INotificationService
{
    Task<IEnumerable<Notification>> GetUserNotificationsAsync(int userId);
    Task<Notification> SendNotificationAsync(NotificationRequestDto dto);
    Task<bool> MarkAsReadAsync(int notificationId, int userId);
    Task<int> MarkAllAsReadAsync(int userId);
    Task<bool> DeleteNotificationAsync(int notificationId, int userId);
}
