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

    public async Task<RefundResponseDto> AdminOverrideRefundAsync(AdminRefundOverrideDto dto, int adminUserId)
    {
        // Admin Edge Case #13: two admins (or a double-submitted request) processing a refund for the
        // same booking concurrently must not both succeed. Serializable isolation forces one of two
        // concurrent transactions here to wait/serialize behind the other, so the second one's
        // "existing refund" re-check below always sees the first one's insert.
        using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            var booking = await _context.Bookings.FirstOrDefaultAsync(b => b.Id == dto.BookingId);
            if (booking == null)
                throw new ArgumentException("Booking not found.");

            var user = await _context.Users.FindAsync(booking.UserId);
            if (user == null)
                throw new ArgumentException("Booking's customer not found.");

            // QA Defect (Low): BookingCustomId is only generated once a booking is actually paid —
            // an unpaid ("Pending Payment") booking has an empty one, which made messages read as
            // "Booking  has already been refunded." Fall back to the numeric Id so it's never blank.
            var bookingLabel = string.IsNullOrEmpty(booking.BookingCustomId) ? booking.Id.ToString() : booking.BookingCustomId;

            // Customer #20 / Admin #13: reject if a completed refund already exists for this booking —
            // catches both a genuine double-submit and a second admin acting on the same booking.
            var alreadyRefunded = await _context.Refunds
                .AnyAsync(r => r.BookingId == booking.Id && r.Status == "Completed");
            if (alreadyRefunded)
                throw new InvalidOperationException($"Booking {bookingLabel} has already been refunded.");

            user.WalletBalance += dto.Amount;

            var refund = new Refund
            {
                BookingId = booking.Id,
                Amount = dto.Amount,
                Status = "Completed",
                Destination = "Wallet",
                InitiatedByUserId = adminUserId,
                IsAdminOverride = true,
                Reason = dto.Reason,
                CompletedAt = DateTime.UtcNow
            };

            _context.Refunds.Add(refund);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            await _auditLogService.LogActionAsync(
                "Refund", refund.Id, "AdminOverride",
                $"Admin {adminUserId} manually refunded {dto.Amount:C} for booking {bookingLabel}. Reason: {dto.Reason}",
                adminUserId);

            await _notificationQueue.QueueNotificationAsync(new NotificationRequestDto
            {
                UserId = user.Id,
                Message = $"A refund of {dto.Amount:C} has been credited to your wallet for booking {bookingLabel}. Reason: {dto.Reason}",
                Type = "RefundProcessed"
            });

            return new RefundResponseDto
            {
                Id = refund.Id,
                BookingId = refund.BookingId,
                BookingCustomId = booking.BookingCustomId,
                Amount = refund.Amount,
                Status = refund.Status,
                Destination = refund.Destination,
                IsAdminOverride = refund.IsAdminOverride,
                Reason = refund.Reason,
                CreatedAt = refund.CreatedAt,
                CompletedAt = refund.CompletedAt
            };
        }
        catch (Exception ex) when (TransientDbFailure.IsTransient(ex))
        {
            // Same class of defect as BookingService's Serializable-transaction paths — a real
            // conflict under contention shouldn't leak EF/SqlClient's raw driver text to the client.
            // Catches both a SaveChangesAsync-time DbUpdateException and a raw SqlException from an
            // earlier read (e.g. the "already refunded" re-check) inside the same transaction.
            await transaction.RollbackAsync();
            throw new InvalidOperationException("This refund could not be processed due to a conflicting operation. Please try again.");
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}
