using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Services;
using HotelBooking.API.Features.Payments.DTOs;
using HotelBooking.API.Features.Payments.Models;
using HotelBooking.API.Users.Services;
using HotelBooking.API.Common.Services;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.API.Features.Payments.Services;

public class RefundService : IRefundService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;
    private readonly INotificationQueue _notificationQueue;

    public RefundService(ApplicationDbContext context, IAuditLogService auditLogService, INotificationQueue notificationQueue)
    {
        _context = context;
        _auditLogService = auditLogService;
        _notificationQueue = notificationQueue;
    }

    public async Task<IEnumerable<RefundResponseDto>> GetRefundsForBookingAsync(int bookingId, int userId, bool isAdmin)
    {
        var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.Id == bookingId);
        if (booking == null)
            throw new ArgumentException("Booking not found.");

        if (!isAdmin && booking.UserId != userId)
            throw new UnauthorizedAccessException("You can only view refunds for your own bookings.");

        return await _context.Refunds
            .Where(r => r.BookingId == bookingId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new RefundResponseDto
            {
                Id = r.Id,
                BookingId = r.BookingId,
                BookingCustomId = booking.BookingCustomId,
                Amount = r.Amount,
                Status = r.Status,
                Destination = r.Destination,
                IsAdminOverride = r.IsAdminOverride,
                Reason = r.Reason,
                CreatedAt = r.CreatedAt,
                CompletedAt = r.CompletedAt
            })
            .ToListAsync();
    }

    // No admin-initiated refund path — refunds are only ever created inside the customer's own
    // cancellation/modification flow (BookingService.CancelBookingAsync/AdminCancelBookingAsync's
    // own refund-tier logic already covers the admin-cancel case without a separate manual entry
    // point). GetRefundsForBookingAsync above remains admin's only touchpoint on this service — view only.
}
