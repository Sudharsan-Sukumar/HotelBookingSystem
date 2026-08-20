using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using HotelBooking.API.Data;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Services;
using HotelBooking.API.Users.Models;

namespace HotelBooking.API.Users.Services;

public class UserBanService : IUserBanService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditService;
    private readonly INotificationQueue _notificationQueue;

    public UserBanService(ApplicationDbContext context, IAuditLogService auditService, INotificationQueue notificationQueue)
    {
        _context = context;
        _auditService = auditService;
        _notificationQueue = notificationQueue;
    }

    // State Check + Queued Event Notification — suspends a user only if not already suspended, then queues a decoupled notification event.
    public async Task<bool> BanUserAsync(int userId, string reason, int adminId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null || user.Status == "Suspended") return false;

        user.Status = "Suspended";
        user.UpdatedAt = DateTime.UtcNow;

        _context.Users.Update(user);
        
        await _auditService.LogActionAsync("User", userId, "BanUser", $"User banned. Reason: {reason}", adminId);

        await _context.SaveChangesAsync();

        await _notificationQueue.QueueNotificationAsync(new NotificationRequestDto
        {
            UserId = userId,
            Message = $"Your account has been suspended. Reason: {reason}",
            Type = "AccountSuspended"
        });

        return true;
    }

    public async Task<bool> UnbanUserAsync(int userId, string reason, int adminId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null || user.Status != "Suspended") return false;

        user.Status = "Active";
        user.UpdatedAt = DateTime.UtcNow;

        _context.Users.Update(user);
        
        await _auditService.LogActionAsync("User", userId, "UnbanUser", $"User ban lifted. Reason: {reason}", adminId);

        await _context.SaveChangesAsync();

        await _notificationQueue.QueueNotificationAsync(new NotificationRequestDto
        {
            UserId = userId,
            Message = $"Your account suspension has been lifted. Reason: {reason}",
            Type = "AccountReinstated"
        });

        return true;
    }
}
