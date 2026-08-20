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

    // IST is a fixed UTC+5:30 offset with no daylight-saving rules, so a plain offset add is exact
    // and avoids relying on a "Asia/Kolkata"/"India Standard Time" TimeZoneInfo id that differs
    // between Windows and Linux hosts. CreatedAt is stored as UTC (DateTime.UtcNow at insert time).
    private static System.DateTime ToIst(System.DateTime utc) => utc.AddHours(5).AddMinutes(30);

    // Facade — combines user, revenue, promotion, and backup data from four tables into one summary DTO.
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
            LastBackupStatus = lastBackup != null
                ? $"{lastBackup.Status} at {ToIst(lastBackup.CreatedAt):dd-MM-yyyy HH:mm:ss} IST"
                : "No backups found"
        };
    }
}
