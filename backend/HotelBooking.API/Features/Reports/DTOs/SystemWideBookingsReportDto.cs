using System.Collections.Generic;

namespace HotelBooking.API.Features.Reports.DTOs;

public class SystemWideBookingsReportDto
{
    public int TotalBookings { get; set; }
    public decimal TotalRevenue { get; set; }
    public double SystemCancellationRate { get; set; }
    public double AverageOccupancyRate { get; set; }
    public List<HotelPerformanceDto> HotelPerformances { get; set; } = new();
}

public class HotelPerformanceDto
{
    public string HotelCustomId { get; set; } = string.Empty;
    public string HotelName { get; set; } = string.Empty;
    public int BookingsCount { get; set; }
    public decimal Revenue { get; set; }
    public double CancellationRate { get; set; }
    public double OccupancyRate { get; set; }
}
