namespace HotelBooking.API.Features.CMS.DTOs;

public class AdminDashboardDto
{
    public int TotalActiveUsers { get; set; }
    public decimal TotalRevenue { get; set; }
    public int ActivePromotionsCount { get; set; }
    public string LastBackupStatus { get; set; } = "N/A";
}
