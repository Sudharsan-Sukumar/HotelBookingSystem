using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Reports.DTOs;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.API.Features.Reports.Services;

public class ReportService : IReportService
{
    private readonly ApplicationDbContext _context;

    public ReportService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<CustomerBookingSummaryDto>> GetCustomerBookingsSummaryAsync(int userId)
    {
        return await _context.Bookings
            .Include(b => b.Hotel)
            .Include(b => b.RoomType)
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new CustomerBookingSummaryDto
            {
                BookingId = b.Id,
                BookingCustomId = b.BookingCustomId,
                HotelName = b.Hotel.Name,
                RoomTypeName = b.RoomType.Name,
                CheckInDate = b.CheckInDate,
                CheckOutDate = b.CheckOutDate,
                TotalAmount = b.TotalAmount,
                Status = b.Status
            })
            .ToListAsync();
    }

    public async Task<IEnumerable<CustomerTransactionReportDto>> GetCustomerTransactionsAsync(int userId, DateTime? startDate, DateTime? endDate)
    {
        var query = _context.Payments
            .Include(p => p.Booking)
            .Where(p => p.Booking.UserId == userId);

        if (startDate.HasValue)
        {
            query = query.Where(p => p.PaymentDate >= startDate.Value);
        }
        if (endDate.HasValue)
        {
            query = query.Where(p => p.PaymentDate <= endDate.Value);
        }

        return await query
            .OrderByDescending(p => p.PaymentDate)
            .Select(p => new CustomerTransactionReportDto
            {
                TransactionId = p.TransactionId,
                BookingCustomId = p.Booking.BookingCustomId,
                Amount = p.Amount,
                WalletAmountUsed = p.UsedWallet ? p.Booking.WalletAmountUsed : 0,
                PaymentMethod = p.PaymentMethod,
                Status = p.Status,
                PaymentDate = p.PaymentDate,
                Type = p.Status == "Refunded" ? "Refund" : "Payment"
            })
            .ToListAsync();
    }

    public async Task<bool> IsManagerOfHotelAsync(int userId, int hotelId)
    {
        var hotel = await _context.Hotels.FindAsync(hotelId);
        return hotel != null && hotel.ManagerIds.Contains(userId);
    }

    public async Task<HotelReservationsReportDto> GetHotelReservationsReportAsync(int hotelId, DateTime? startDate, DateTime? endDate, int? roomTypeId, int page = 1, int pageSize = 100)
    {
        var hotel = await _context.Hotels.FirstOrDefaultAsync(h => h.Id == hotelId);
        if (hotel == null)
            throw new KeyNotFoundException("Hotel not found.");

        page = page < 1 ? 1 : page;
        pageSize = pageSize < 1 ? 100 : Math.Min(pageSize, 500); // Admin Edge Case #16: hard cap per page

        var query = _context.Bookings
            .Where(b => b.HotelId == hotelId);

        if (startDate.HasValue)
            query = query.Where(b => b.CheckInDate >= startDate.Value);
        if (endDate.HasValue)
            query = query.Where(b => b.CheckInDate <= endDate.Value);
        if (roomTypeId.HasValue)
            query = query.Where(b => b.RoomTypeId == roomTypeId.Value);

        // Admin Edge Case #16: aggregates are computed by SQL (SumAsync/CountAsync) over the full
        // filtered set WITHOUT materializing every row into memory — this is what actually matters
        // for a hotel/date range spanning millions of bookings, not just the detail-row pagination.
        var totalBookings = await query.CountAsync();
        var totalRevenue = await query.Where(b => b.Status != "Cancelled").SumAsync(b => b.TotalAmount);

        // Simple mock occupancy rate based on currently active bookings vs total hotel capacity for the current day.
        var totalRooms = await _context.RoomTypes.Where(rt => rt.HotelId == hotelId).SumAsync(rt => rt.TotalRooms);
        double occupancyRate = 0;
        if (totalRooms > 0)
        {
            var activeBookings = await query
                .Where(b => b.Status != "Cancelled" && b.CheckInDate <= DateTime.UtcNow && b.CheckOutDate > DateTime.UtcNow)
                .SumAsync(b => b.NumberOfRooms);
            occupancyRate = (double)activeBookings / totalRooms * 100;
        }

        var pageOfBookings = await query
            .Include(b => b.User)
            .Include(b => b.RoomType)
            .OrderByDescending(b => b.CheckInDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new HotelReservationsReportDto
        {
            HotelName = hotel.Name,
            TotalBookings = totalBookings,
            TotalRevenue = totalRevenue,
            OccupancyRatePercentage = occupancyRate,
            Page = page,
            PageSize = pageSize,
            Reservations = pageOfBookings.Select(b => new ReservationDetailDto
            {
                BookingCustomId = b.BookingCustomId,
                CustomerName = $"{b.User.FirstName} {b.User.LastName}",
                RoomTypeName = b.RoomType.Name,
                CheckInDate = b.CheckInDate.ToString("yyyy-MM-dd"),
                CheckOutDate = b.CheckOutDate.ToString("yyyy-MM-dd"),
                Status = b.Status,
                Amount = b.TotalAmount
            }).ToList()
        };
    }

    public async Task<SystemWideBookingsReportDto> GetSystemWideBookingsReportAsync(int? hotelId, DateTime? startDate, DateTime? endDate)
    {
        var query = _context.Bookings.AsQueryable();

        if (hotelId.HasValue)
            query = query.Where(b => b.HotelId == hotelId.Value);
        if (startDate.HasValue)
            query = query.Where(b => b.CheckInDate >= startDate.Value);
        if (endDate.HasValue)
            query = query.Where(b => b.CheckInDate <= endDate.Value);

        // Admin Edge Case #16: every aggregate below is computed by SQL (CountAsync/SumAsync/GroupBy)
        // over the filtered set — a system-wide report spanning millions of bookings never
        // materializes the raw rows into memory to compute these numbers.
        var totalBookings = await query.CountAsync();
        var totalRevenue = await query.Where(b => b.Status != "Cancelled").SumAsync(b => b.TotalAmount);
        var cancellations = await query.CountAsync(b => b.Status == "Cancelled");
        double systemCancelRate = totalBookings > 0 ? (double)cancellations / totalBookings * 100 : 0;

        var totalSystemRooms = await _context.RoomTypes.SumAsync(rt => rt.TotalRooms);
        var activeRooms = await query
            .Where(b => b.Status != "Cancelled" && b.CheckInDate <= DateTime.UtcNow && b.CheckOutDate > DateTime.UtcNow)
            .SumAsync(b => b.NumberOfRooms);
        double avgOccupancy = totalSystemRooms > 0 ? (double)activeRooms / totalSystemRooms * 100 : 0;

        // Per-hotel occupancy, same formula as the average above (active rooms / that hotel's total
        // rooms), grouped by hotel so each entry in hotelPerformances gets its own real figure instead
        // of the previous hardcoded 0.
        var activeRoomsPerHotel = await query
            .Where(b => b.Status != "Cancelled" && b.CheckInDate <= DateTime.UtcNow && b.CheckOutDate > DateTime.UtcNow)
            .GroupBy(b => b.HotelId)
            .Select(g => new { HotelId = g.Key, ActiveRooms = g.Sum(b => b.NumberOfRooms) })
            .ToDictionaryAsync(x => x.HotelId, x => x.ActiveRooms);

        var totalRoomsPerHotel = await _context.RoomTypes
            .GroupBy(rt => rt.HotelId)
            .Select(g => new { HotelId = g.Key, TotalRooms = g.Sum(rt => rt.TotalRooms) })
            .ToDictionaryAsync(x => x.HotelId, x => x.TotalRooms);

        // Group by HotelId (a scalar, SQL-translatable key) rather than the Hotel navigation object —
        // grouping by an entity reference can't be pushed down to SQL and forces a full client-side
        // materialization, exactly the OOM risk this fix is closing.
        var perHotelStats = await query
            .GroupBy(b => b.HotelId)
            .Select(g => new
            {
                HotelId = g.Key,
                BookingsCount = g.Count(),
                Revenue = g.Where(b => b.Status != "Cancelled").Sum(b => b.TotalAmount),
                Cancellations = g.Count(b => b.Status == "Cancelled")
            })
            .ToListAsync();

        var hotelNames = await _context.Hotels
            .Where(h => perHotelStats.Select(s => s.HotelId).Contains(h.Id))
            .ToDictionaryAsync(h => h.Id, h => (h.HotelCustomId, h.Name));

        var hotelPerformances = perHotelStats.Select(s => new HotelPerformanceDto
        {
            HotelCustomId = hotelNames.TryGetValue(s.HotelId, out var info) ? info.HotelCustomId : string.Empty,
            HotelName = hotelNames.TryGetValue(s.HotelId, out var info2) ? info2.Name : string.Empty,
            BookingsCount = s.BookingsCount,
            Revenue = s.Revenue,
            CancellationRate = s.BookingsCount > 0 ? (double)s.Cancellations / s.BookingsCount * 100 : 0,
            OccupancyRate = totalRoomsPerHotel.TryGetValue(s.HotelId, out var hotelTotalRooms) && hotelTotalRooms > 0
                ? (double)(activeRoomsPerHotel.TryGetValue(s.HotelId, out var hotelActiveRooms) ? hotelActiveRooms : 0) / hotelTotalRooms * 100
                : 0
        }).ToList();

        return new SystemWideBookingsReportDto
        {
            TotalBookings = totalBookings,
            TotalRevenue = totalRevenue,
            SystemCancellationRate = systemCancelRate,
            AverageOccupancyRate = avgOccupancy,
            HotelPerformances = hotelPerformances
        };
    }

    public async Task<CustomerActivityReportDto> GetCustomerActivityReportAsync(int customerId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == customerId);
        if (user == null)
            throw new KeyNotFoundException("Customer not found.");

        var bookings = await _context.Bookings.Where(b => b.UserId == customerId).ToListAsync();

        return new CustomerActivityReportDto
        {
            CustomerCustomId = user.UserCustomId,
            FullName = $"{user.FirstName} {user.LastName}",
            Email = user.Email,
            RegistrationDate = user.CreatedAt,
            TotalBookings = bookings.Count,
            TotalSpend = bookings.Where(b => b.Status != "Cancelled").Sum(b => b.TotalAmount),
            Cancellations = bookings.Count(b => b.Status == "Cancelled"),
            ReviewsSubmitted = 0 // Mocked to 0 for now as per plan
        };
    }
}
