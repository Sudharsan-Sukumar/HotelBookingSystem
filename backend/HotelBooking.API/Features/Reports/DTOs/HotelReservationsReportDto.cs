using System.Collections.Generic;

namespace HotelBooking.API.Features.Reports.DTOs;

public class HotelReservationsReportDto
{
    public string HotelName { get; set; } = string.Empty;
    public int TotalBookings { get; set; }
    public decimal TotalRevenue { get; set; }
    public double OccupancyRatePercentage { get; set; }

    // Admin Edge Case #16: with a large hotel/date range, "Reservations" can be far too many rows
    // to return in one response — it's paginated; TotalBookings/TotalRevenue/OccupancyRatePercentage
    // above are computed over the FULL filtered set regardless of which page is being viewed.
    public int Page { get; set; }
    public int PageSize { get; set; }
    public List<ReservationDetailDto> Reservations { get; set; } = new();
}

public class ReservationDetailDto
{
    public string BookingCustomId { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string RoomTypeName { get; set; } = string.Empty;
    public string CheckInDate { get; set; } = string.Empty;
    public string CheckOutDate { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal Amount { get; set; }
}
