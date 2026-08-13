using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Bookings.Models;
using HotelBooking.API.Features.Rooms.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.API.Features.Bookings.Services;

public interface IRoomAllocationService
{
    Task<IEnumerable<Room>> AllocateRoomsAsync(int bookingId, int managerId);
}

public class RoomAllocationService : IRoomAllocationService
{
    private readonly ApplicationDbContext _context;

    public RoomAllocationService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Room>> AllocateRoomsAsync(int bookingId, int managerId)
    {
        var booking = await _context.Bookings
            .Include(b => b.Hotel)
            .FirstOrDefaultAsync(b => b.Id == bookingId);

        if (booking == null) throw new ArgumentException("Booking not found.");
        
        if (!booking.Hotel.ManagerIds.Contains(managerId))
            throw new UnauthorizedAccessException("You can only allocate rooms in your own hotels.");

        if (booking.Status != "Confirmed")
            throw new InvalidOperationException("Only confirmed bookings can be allocated rooms.");

        // JIT Allocation (Edge Case 16)
        using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            var existingAllocations = await _context.BookingRooms
                .Where(br => br.BookingId == bookingId)
                .ToListAsync();

            if (existingAllocations.Any())
                throw new InvalidOperationException("Rooms are already allocated for this booking.");

            // Find available rooms for the dates
            var allocatedRoomIdsQuery = _context.BookingRooms
                .Include(br => br.Booking)
                .Where(br => br.Booking.Status != "Cancelled" &&
                             br.Booking.CheckInDate < booking.CheckOutDate && 
                             br.Booking.CheckOutDate > booking.CheckInDate)
                .Select(br => br.RoomId);

            var availableRooms = await _context.Rooms
                .Where(r => r.HotelId == booking.HotelId &&
                            r.RoomTypeId == booking.RoomTypeId &&
                            r.Status == "Available" &&
                            !allocatedRoomIdsQuery.Contains(r.Id))
                .Take(booking.NumberOfRooms)
                .ToListAsync();

            if (availableRooms.Count < booking.NumberOfRooms)
                throw new InvalidOperationException("Not enough physical rooms available for allocation.");

            foreach (var room in availableRooms)
            {
                _context.BookingRooms.Add(new BookingRoom
                {
                    BookingId = booking.Id,
                    RoomId = room.Id
                });
            }

            booking.Status = "CheckedIn"; // Update state

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return availableRooms;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}
