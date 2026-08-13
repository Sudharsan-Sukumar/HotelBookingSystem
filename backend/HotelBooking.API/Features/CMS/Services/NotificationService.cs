using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using HotelBooking.API.Data;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Models;

namespace HotelBooking.API.Features.CMS.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _context;

    public NotificationService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Notification>> GetUserNotificationsAsync(int userId)
    {
        // AsNoTracking: besides being the right call for a read-only query, this also prevents EF's
        // relationship-fixup from wiring an already-tracked User (e.g. loaded earlier in this same
        // request by the JWT auth pipeline) onto Notification.User — see the [JsonIgnore] note on
        // that property for why that mattered.
        return await _context.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();
    }

    public async Task<Notification> SendNotificationAsync(NotificationRequestDto dto)
    {
        if (dto.UserId.HasValue)
        {
            var notification = new Notification
            {
                UserId = dto.UserId.Value,
                Message = dto.Message,
                Type = dto.Type,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();
            return notification;
        }
        else
        {
            // System-wide broadcast: chunk processing to avoid OOM
            var activeUsers = _context.Users.Where(u => u.Status == "Active").Select(u => u.Id);
            
            int pageSize = 500;
            int skip = 0;
            
            while (true)
            {
                var userIds = await activeUsers.Skip(skip).Take(pageSize).ToListAsync();
                if (!userIds.Any()) break;

                var notifications = userIds.Select(id => new Notification
                {
                    UserId = id,
                    Message = dto.Message,
                    Type = dto.Type,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                }).ToList();

                _context.Notifications.AddRange(notifications);
                await _context.SaveChangesAsync();
                _context.ChangeTracker.Clear(); // Free up memory

                skip += pageSize;
            }

            return new Notification { Message = dto.Message, Type = dto.Type, CreatedAt = DateTime.UtcNow };
        }
    }

    public async Task<bool> MarkAsReadAsync(int notificationId, int userId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);
            
        if (notification == null) return false;

        notification.IsRead = true;
        _context.Notifications.Update(notification);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<int> MarkAllAsReadAsync(int userId)
    {
        var unread = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var notification in unread)
            notification.IsRead = true;

        if (unread.Count > 0)
            await _context.SaveChangesAsync();

        return unread.Count;
    }

    public async Task<bool> DeleteNotificationAsync(int notificationId, int userId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

        if (notification == null) return false;

        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync();
        return true;
    }
}
