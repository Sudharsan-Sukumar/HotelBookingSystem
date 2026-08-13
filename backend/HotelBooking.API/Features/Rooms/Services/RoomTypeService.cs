using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Rooms.Models;
using HotelBooking.API.Features.Rooms.DTOs;
using HotelBooking.API.Users.Services;

namespace HotelBooking.API.Features.Rooms.Services;

public class RoomTypeService : IRoomTypeService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly IAuditLogService _auditLogService;
    private static string RoomTypesByHotelCacheKey(int hotelId) => $"RoomTypesByHotel_{hotelId}";

    public RoomTypeService(ApplicationDbContext context, IMemoryCache cache, IAuditLogService auditLogService)
    {
        _context = context;
        _cache = cache;
        _auditLogService = auditLogService;
    }

    private async Task<bool> IsHotelManagerAsync(int hotelId, int managerId)
    {
        var hotel = await _context.Hotels.FindAsync(hotelId);
        return hotel != null && hotel.ManagerIds.Contains(managerId);
    }

    public async Task<RoomTypeResponseDto> CreateRoomTypeAsync(int hotelId, int managerId, RoomTypeRequestDto request)
    {
        var hotel = await _context.Hotels.FindAsync(hotelId);
        if (hotel == null || !hotel.ManagerIds.Contains(managerId))
            throw new UnauthorizedAccessException("You can only add room types to your own hotels.");

        var roomType = new RoomType
        {
            HotelId = hotelId,
            Name = request.Name,
            Description = request.Description,
            BasePrice = request.BasePrice,
            Capacity = request.Capacity,
            TotalRooms = request.TotalRooms,
            IsActive = true
        };

        _context.RoomTypes.Add(roomType);
        await _context.SaveChangesAsync();
        _cache.Remove(RoomTypesByHotelCacheKey(hotelId));

        await _auditLogService.LogActionAsync(
            "RoomType", roomType.Id, "Create",
            $"Room type '{roomType.Name}' created for hotel {hotelId} by manager {managerId}.",
            managerId);

        return new RoomTypeResponseDto
        {
            Id = roomType.Id,
            HotelId = roomType.HotelId,
            Name = roomType.Name,
            Description = roomType.Description,
            BasePrice = roomType.BasePrice,
            Capacity = roomType.Capacity,
            TotalRooms = roomType.TotalRooms,
            IsActive = roomType.IsActive,
            IsUnderMaintenance = roomType.IsUnderMaintenance
        };
    }

    public async Task<IEnumerable<RoomTypeResponseDto>> GetRoomTypesByHotelAsync(int hotelId)
    {
        var cacheKey = RoomTypesByHotelCacheKey(hotelId);
        if (_cache.TryGetValue(cacheKey, out IEnumerable<RoomTypeResponseDto>? cached))
            return cached ?? Array.Empty<RoomTypeResponseDto>();

        var roomTypes = await _context.RoomTypes
            .AsNoTracking()
            .Where(rt => rt.HotelId == hotelId)
            .Select(rt => new RoomTypeResponseDto
            {
                Id = rt.Id,
                HotelId = rt.HotelId,
                Name = rt.Name,
                Description = rt.Description,
                BasePrice = rt.BasePrice,
                Capacity = rt.Capacity,
                TotalRooms = rt.TotalRooms,
                IsActive = rt.IsActive,
                IsUnderMaintenance = rt.IsUnderMaintenance
            })
            .ToListAsync();

        _cache.Set(cacheKey, roomTypes, new MemoryCacheEntryOptions().SetAbsoluteExpiration(TimeSpan.FromMinutes(5)));
        return roomTypes;
    }

    public async Task<RoomTypeResponseDto> UpdateRoomTypeAsync(int roomTypeId, int managerId, RoomTypeRequestDto request)
    {
        var roomType = await _context.RoomTypes.FindAsync(roomTypeId);
        if (roomType == null)
            throw new ArgumentException("Room type not found.");

        var isManager = await IsHotelManagerAsync(roomType.HotelId, managerId);
        if (!isManager)
            throw new UnauthorizedAccessException("You can only edit room types in your own hotels.");

        // Admin Edge Case #14: a room type under maintenance is locked against detail edits. The flag
        // check alone has a race window (two requests can both read IsUnderMaintenance==false before
        // either writes), so re-check it again immediately before the final SaveChangesAsync below,
        // inside the same request, after re-reading the row — genuine protection against the race
        // comes from EF's optimistic-concurrency RowVersion check on that final save.
        if (roomType.IsUnderMaintenance)
            throw new InvalidOperationException("This room type is under maintenance and cannot be edited until maintenance mode is cleared.");

        // Edge Case 8: Admin lowers total inventory but it falls below currently active confirmed reservations
        if (request.TotalRooms < roomType.TotalRooms)
        {
            var activeBookings = await _context.Bookings
                .Where(b => b.RoomTypeId == roomTypeId && b.Status != "Cancelled" && b.CheckOutDate > DateTime.UtcNow)
                .SumAsync(b => b.NumberOfRooms);

            if (request.TotalRooms < activeBookings)
                throw new InvalidOperationException($"Cannot lower total rooms below currently active confirmed reservations ({activeBookings}). Please relocate guests first.");
        }

        // Admin Edge Case: reducing occupancy/Capacity while active bookings exist for this room type.
        // Booking rows don't store a per-booking guest count (removed from the schema), so there's no
        // way to check "does any existing booking actually need the higher capacity" — the safe rule
        // is to block any Capacity decrease outright while active/future bookings exist at all.
        if (request.Capacity < roomType.Capacity)
        {
            var hasActiveBookings = await _context.Bookings
                .AnyAsync(b => b.RoomTypeId == roomTypeId && b.Status != "Cancelled" && b.CheckOutDate > DateTime.UtcNow);

            if (hasActiveBookings)
                throw new InvalidOperationException("Cannot reduce occupancy/capacity while active or future bookings exist for this room type.");
        }

        roomType.Name = request.Name;
        roomType.Description = request.Description;
        roomType.BasePrice = request.BasePrice;
        roomType.Capacity = request.Capacity;
        roomType.TotalRooms = request.TotalRooms;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new DbUpdateConcurrencyException("The room type was modified by another user. Please refresh and try again.");
        }

        _cache.Remove(RoomTypesByHotelCacheKey(roomType.HotelId));

        await _auditLogService.LogActionAsync(
            "RoomType", roomType.Id, "Update",
            $"Room type '{roomType.Name}' updated by manager {managerId} (basePrice: {roomType.BasePrice}, capacity: {roomType.Capacity}, totalRooms: {roomType.TotalRooms}).",
            managerId);

        return new RoomTypeResponseDto
        {
            Id = roomType.Id,
            HotelId = roomType.HotelId,
            Name = roomType.Name,
            Description = roomType.Description,
            BasePrice = roomType.BasePrice,
            Capacity = roomType.Capacity,
            TotalRooms = roomType.TotalRooms,
            IsActive = roomType.IsActive,
            IsUnderMaintenance = roomType.IsUnderMaintenance
        };
    }

    public async Task<RoomTypeResponseDto> SetMaintenanceModeAsync(int roomTypeId, int managerId, bool isUnderMaintenance)
    {
        var roomType = await _context.RoomTypes.FindAsync(roomTypeId);
        if (roomType == null)
            throw new ArgumentException("Room type not found.");

        var isManager = await IsHotelManagerAsync(roomType.HotelId, managerId);
        if (!isManager)
            throw new UnauthorizedAccessException("You can only manage room types in your own hotels.");

        roomType.IsUnderMaintenance = isUnderMaintenance;

        try
        {
            // RoomType.RowVersion is a [Timestamp] concurrency token, so EF automatically includes
            // the originally-loaded value in this UPDATE's WHERE clause — if UpdateRoomTypeAsync (or
            // another SetMaintenanceModeAsync call) modified this row after it was loaded above, this
            // throws instead of silently overwriting the other request's change.
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new DbUpdateConcurrencyException("This room type was modified by another operation. Please refresh and try again.");
        }

        _cache.Remove(RoomTypesByHotelCacheKey(roomType.HotelId));

        await _auditLogService.LogActionAsync(
            "RoomType", roomType.Id, "MaintenanceModeChange",
            $"Room type '{roomType.Name}' maintenance mode set to {isUnderMaintenance} by manager {managerId}.",
            managerId);

        return new RoomTypeResponseDto
        {
            Id = roomType.Id,
            HotelId = roomType.HotelId,
            Name = roomType.Name,
            Description = roomType.Description,
            BasePrice = roomType.BasePrice,
            Capacity = roomType.Capacity,
            TotalRooms = roomType.TotalRooms,
            IsActive = roomType.IsActive,
            IsUnderMaintenance = roomType.IsUnderMaintenance
        };
    }

    public async Task<bool> DeleteRoomTypeAsync(int roomTypeId, int managerId)
    {
        var roomType = await _context.RoomTypes.FindAsync(roomTypeId);
        if (roomType == null) return false;

        var isManager = await IsHotelManagerAsync(roomType.HotelId, managerId);
        if (!isManager)
            throw new UnauthorizedAccessException("You can only delete room types in your own hotels.");

        // Edge Case 3: Admin deletes room type -> Soft delete check
        bool hasActiveBookings = await _context.Bookings
            .AnyAsync(b => b.RoomTypeId == roomTypeId && b.Status != "Cancelled" && b.CheckOutDate > DateTime.UtcNow);

        bool softDeleted;
        if (hasActiveBookings)
        {
            roomType.IsActive = false; // Soft delete
            softDeleted = true;
        }
        else
        {
            _context.RoomTypes.Remove(roomType); // Hard delete if no active bookings
            softDeleted = false;
        }

        await _context.SaveChangesAsync();
        _cache.Remove(RoomTypesByHotelCacheKey(roomType.HotelId));

        if (softDeleted)
        {
            await _auditLogService.LogActionAsync(
                "RoomType", roomTypeId, "StatusChange",
                $"Room type '{roomType.Name}' soft-deleted (deactivated) by manager {managerId} due to active bookings.",
                managerId);
        }
        else
        {
            await _auditLogService.LogActionAsync(
                "RoomType", roomTypeId, "Delete",
                $"Room type '{roomType.Name}' permanently deleted by manager {managerId}.",
                managerId);
        }

        return true;
    }
}
