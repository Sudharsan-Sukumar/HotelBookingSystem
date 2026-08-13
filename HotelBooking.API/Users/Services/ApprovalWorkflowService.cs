using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using HotelBooking.API.Data;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Services;
using HotelBooking.API.Users.DTOs;

namespace HotelBooking.API.Users.Services;

public class ApprovalWorkflowService : IApprovalWorkflowService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditService;
    private readonly INotificationQueue _notificationQueue;

    public ApprovalWorkflowService(ApplicationDbContext context, IAuditLogService auditService, INotificationQueue notificationQueue)
    {
        _context = context;
        _auditService = auditService;
        _notificationQueue = notificationQueue;
    }

    public async Task<IEnumerable<ManagerDto>> GetPendingManagersAsync()
    {
        return await _context.Users
            .Include(u => u.Role)
            .Where(u => u.Role.Name == "Manager" && u.Status == "Pending")
            .Select(u => new ManagerDto
            {
                Id = u.Id,
                UserCustomId = u.UserCustomId,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Email = u.Email,
                Phone = u.Phone,
                Status = u.Status,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<bool> ApproveManagerAsync(int managerId, int adminId)
    {
        var manager = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == managerId);
        if (manager == null || manager.Role.Name != "Manager" || !manager.Status.Equals("Pending", StringComparison.OrdinalIgnoreCase)) return false;

        manager.Status = "Active";
        manager.UpdatedAt = DateTime.UtcNow;

        _context.Users.Update(manager);
        
        await _auditService.LogActionAsync("User", managerId, "ApproveManager", "Status changed to Active", adminId);

        await _context.SaveChangesAsync();

        await _notificationQueue.QueueNotificationAsync(new NotificationRequestDto
        {
            UserId = managerId,
            Message = "Your manager account has been approved. You can now sign in.",
            Type = "AccountApproved"
        });

        return true;
    }

    public async Task<bool> RejectManagerAsync(int managerId, int adminId)
    {
        var manager = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.Id == managerId);
        if (manager == null || manager.Role.Name != "Manager" || !manager.Status.Equals("Pending", StringComparison.OrdinalIgnoreCase)) return false;

        manager.Status = "Inactive";
        manager.UpdatedAt = DateTime.UtcNow;

        _context.Users.Update(manager);
        
        await _auditService.LogActionAsync("User", managerId, "RejectManager", "Status changed to Inactive", adminId);

        await _context.SaveChangesAsync();

        await _notificationQueue.QueueNotificationAsync(new NotificationRequestDto
        {
            UserId = managerId,
            Message = "Your manager account registration has been rejected.",
            Type = "AccountRejected"
        });

        return true;
    }
}
