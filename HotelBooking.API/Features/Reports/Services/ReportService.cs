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
        return await _context.HotelManagers.AnyAsync(hm => hm.UserId == userId && hm.HotelId == hotelId);
    }

    public async Task<HotelReservationsReportDto> GetHotelReservationsReportAsync(int hotelId, DateTime? startDate, DateTime? endDate, int? roomTypeId)
    {
        var hotel = await _context.Hotels.FirstOrDefaultAsync(h => h.Id == hotelId);
        if (hotel == null)
            throw new KeyNotFoundException("Hotel not found.");

        var query = _context.Bookings
            .Include(b => b.User)
            .Include(b => b.RoomType)
            .Where(b => b.HotelId == hotelId);

        if (startDate.HasValue)
            query = query.Where(b => b.CheckInDate >= startDate.Value);
        if (endDate.HasValue)
            query = query.Where(b => b.CheckInDate <= endDate.Value);
        if (roomTypeId.HasValue)
            query = query.Where(b => b.RoomTypeId == roomTypeId.Value);

        var bookings = await query.ToListAsync();

        var totalBookings = bookings.Count;
        var totalRevenue = bookings.Where(b => b.Status != "Cancelled").Sum(b => b.TotalAmount);
        
        // Simple mock occupancy rate based on currently active bookings vs total hotel capacity for the current day.
        var totalRooms = await _context.RoomTypes.Where(rt => rt.HotelId == hotelId).SumAsync(rt => rt.TotalRooms);
        double occupancyRate = 0;
        if (totalRooms > 0)
        {
            var activeBookings = bookings.Where(b => b.Status != "Cancelled" && b.CheckInDate <= DateTime.UtcNow && b.CheckOutDate > DateTime.UtcNow).Sum(b => b.NumberOfRooms);
            occupancyRate = (double)activeBookings / totalRooms * 100;
        }

        return new HotelReservationsReportDto
        {
            HotelName = hotel.Name,
            TotalBookings = totalBookings,
            TotalRevenue = totalRevenue,
            OccupancyRatePercentage = occupancyRate,
            Reservations = bookings.Select(b => new ReservationDetailDto
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
        var query = _context.Bookings
            .Include(b => b.Hotel)
            .AsQueryable();

        if (hotelId.HasValue)
            query = query.Where(b => b.HotelId == hotelId.Value);
        if (startDate.HasValue)
            query = query.Where(b => b.CheckInDate >= startDate.Value);
        if (endDate.HasValue)
            query = query.Where(b => b.CheckInDate <= endDate.Value);

        var bookings = await query.ToListAsync();

        var totalBookings = bookings.Count;
        var totalRevenue = bookings.Where(b => b.Status != "Cancelled").Sum(b => b.TotalAmount);
        var cancellations = bookings.Count(b => b.Status == "Cancelled");
        double systemCancelRate = totalBookings > 0 ? (double)cancellations / totalBookings * 100 : 0;

        var hotels = await _context.Hotels.ToListAsync();
        var totalSystemRooms = await _context.RoomTypes.SumAsync(rt => rt.TotalRooms);
        var activeRooms = bookings.Where(b => b.Status != "Cancelled" && b.CheckInDate <= DateTime.UtcNow && b.CheckOutDate > DateTime.UtcNow).Sum(b => b.NumberOfRooms);
        double avgOccupancy = totalSystemRooms > 0 ? (double)activeRooms / totalSystemRooms * 100 : 0;

        var hotelPerformances = bookings.GroupBy(b => b.Hotel)
            .Select(g => new HotelPerformanceDto
            {
                HotelCustomId = g.Key.HotelCustomId,
                HotelName = g.Key.Name,
                BookingsCount = g.Count(),
                Revenue = g.Where(b => b.Status != "Cancelled").Sum(b => b.TotalAmount),
                CancellationRate = g.Count() > 0 ? (double)g.Count(b => b.Status == "Cancelled") / g.Count() * 100 : 0,
                // simplified occupancy
                OccupancyRate = 0 
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
