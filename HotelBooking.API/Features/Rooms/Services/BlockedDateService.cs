using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Rooms.DTOs;
using HotelBooking.API.Features.Rooms.Models;
using HotelBooking.API.Users.Services;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.API.Features.Rooms.Services;

public class BlockedDateService : IBlockedDateService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public BlockedDateService(ApplicationDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    public async Task<BlockedDateResponseDto> AddBlockedDateAsync(BlockedDateRequestDto request)
    {
        var roomType = await _context.RoomTypes.FindAsync(request.RoomTypeId);
        if (roomType == null)
            throw new ArgumentException("Room type not found.");

        // Admin Edge Case #5: only block dates that have no active (non-cancelled) bookings against them.
        var startDate = request.StartDate.Date;
        var endDate = request.EndDate.Date;
        var hasConflictingBooking = await _context.Bookings.AnyAsync(b =>
            b.RoomTypeId == request.RoomTypeId &&
            b.Status != "Cancelled" &&
            b.CheckInDate < endDate && b.CheckOutDate > startDate);

        if (hasConflictingBooking)
            throw new InvalidOperationException("Cannot block these dates — one or more confirmed bookings already exist in this range.");

        var blockedDate = new BlockedDate
        {
            RoomTypeId = request.RoomTypeId,
            StartDate = request.StartDate.Date,
            EndDate = request.EndDate.Date,
            Reason = request.Reason
        };

        _context.BlockedDates.Add(blockedDate);
        await _context.SaveChangesAsync();

        await _auditLogService.LogActionAsync(
            "BlockedDate", blockedDate.Id, "Create",
            $"Blocked date range {blockedDate.StartDate:d}-{blockedDate.EndDate:d} created for room type {blockedDate.RoomTypeId}. Reason: {blockedDate.Reason}.",
            null);

        return new BlockedDateResponseDto
        {
            Id = blockedDate.Id,
            RoomTypeId = blockedDate.RoomTypeId,
            StartDate = blockedDate.StartDate,
            EndDate = blockedDate.EndDate,
            Reason = blockedDate.Reason
        };
    }

    public async Task<IEnumerable<BlockedDateResponseDto>> GetBlockedDatesAsync(int roomTypeId)
    {
        return await _context.BlockedDates
            .Where(bd => bd.RoomTypeId == roomTypeId)
            .OrderBy(bd => bd.StartDate)
            .Select(bd => new BlockedDateResponseDto
            {
                Id = bd.Id,
                RoomTypeId = bd.RoomTypeId,
                StartDate = bd.StartDate,
                EndDate = bd.EndDate,
                Reason = bd.Reason
            })
            .ToListAsync();
    }

    public async Task DeleteBlockedDateAsync(int id)
    {
        var blockedDate = await _context.BlockedDates.FindAsync(id);
        if (blockedDate != null)
        {
            var roomTypeId = blockedDate.RoomTypeId;
            _context.BlockedDates.Remove(blockedDate);
            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(
                "BlockedDate", id, "Delete",
                $"Blocked date {id} deleted for room type {roomTypeId}.",
                null);
        }
    }
}
