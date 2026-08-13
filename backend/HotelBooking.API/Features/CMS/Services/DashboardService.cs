using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using HotelBooking.API.Data;
using HotelBooking.API.Features.CMS.DTOs;

namespace HotelBooking.API.Features.CMS.Services;

public class DashboardService : IDashboardService
{
    private readonly ApplicationDbContext _context;

    public DashboardService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AdminDashboardDto> GetSummaryAsync()
    {
        var totalUsers = await _context.Users.CountAsync(u => u.Status == "Active");
        var totalRevenue = await _context.Payments.Where(p => p.Status == "Completed").SumAsync(p => p.Amount);
        var activePromotions = await _context.Promotions.CountAsync(p => p.IsActive && p.ValidUntil > System.DateTime.UtcNow);
        var lastBackup = await _context.DatabaseBackups.OrderByDescending(b => b.CreatedAt).FirstOrDefaultAsync();

        return new AdminDashboardDto
        {
            TotalActiveUsers = totalUsers,
            TotalRevenue = totalRevenue,
            ActivePromotionsCount = activePromotions,
            LastBackupStatus = lastBackup != null ? $"{lastBackup.Status} at {lastBackup.CreatedAt}" : "No backups found"
        };
    }
}
