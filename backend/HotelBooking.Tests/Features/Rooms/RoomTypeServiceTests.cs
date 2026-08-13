using System;
using System.Threading.Tasks;
using HotelBooking.API.Features.Bookings.Models;
using HotelBooking.API.Features.Hotels.Models;
using HotelBooking.API.Features.Rooms.DTOs;
using HotelBooking.API.Features.Rooms.Models;
using HotelBooking.API.Features.Rooms.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using NUnit.Framework;

namespace HotelBooking.Tests.Features.Rooms;

[TestFixture]
public class RoomTypeServiceTests
{
    private HotelBooking.API.Data.ApplicationDbContext _context = null!;
    private RoomTypeService _service = null!;
    private Hotel _hotel = null!;
    private RoomType _roomType = null!;
    private string _dbName = null!;
    private const int ManagerId = 7;

    [SetUp]
    public void SetUp()
    {
        _dbName = Guid.NewGuid().ToString();
        _context = TestDbContextFactory.Create(_dbName);
        _service = new RoomTypeService(_context, new MemoryCache(new MemoryCacheOptions()), new FakeAuditLogService());

        _hotel = new Hotel { Name = "Occupancy Hotel", City = "Chennai", RowVersion = new byte[8] };
        _hotel.ManagerIds.Add(ManagerId);
        _context.Hotels.Add(_hotel);
        _context.SaveChanges();

        _roomType = new RoomType
        {
            HotelId = _hotel.Id,
            Name = "Deluxe",
            BasePrice = 1000,
            Capacity = 4,
            TotalRooms = 5,
            IsActive = true,
            RowVersion = new byte[8]
        };
        _context.RoomTypes.Add(_roomType);
        _context.SaveChanges();
    }

    [TearDown]
    public void TearDown() => _context.Dispose();

    private void SeedActiveBooking()
    {
        _context.Bookings.Add(new Booking
        {
            BookingCustomId = "BK-TEST-OCC-1",
            UserId = 1,
            HotelId = _roomType.HotelId,
            RoomTypeId = _roomType.Id,
            CheckInDate = DateTime.UtcNow.AddDays(5),
            CheckOutDate = DateTime.UtcNow.AddDays(7),
            NumberOfRooms = 1,
            Status = "Confirmed",
            RowVersion = new byte[8]
        });
        _context.SaveChanges();
    }

    [Test]
    public void UpdateRoomTypeAsync_ReducesCapacityWithActiveBookings_ThrowsInvalidOperationException()
    {
        SeedActiveBooking();

        var request = new RoomTypeRequestDto { Name = "Deluxe", BasePrice = 1000, Capacity = 2, TotalRooms = 5 };

        Assert.ThrowsAsync<InvalidOperationException>(() => _service.UpdateRoomTypeAsync(_roomType.Id, ManagerId, request));
    }

    [Test]
    public async Task UpdateRoomTypeAsync_ReducesCapacityWithNoActiveBookings_Succeeds()
    {
        var request = new RoomTypeRequestDto { Name = "Deluxe", BasePrice = 1000, Capacity = 2, TotalRooms = 5 };

        var result = await _service.UpdateRoomTypeAsync(_roomType.Id, ManagerId, request);

        Assert.That(result.Capacity, Is.EqualTo(2));
    }

    [Test]
    public async Task UpdateRoomTypeAsync_IncreasesCapacityWithActiveBookings_Succeeds()
    {
        SeedActiveBooking();

        var request = new RoomTypeRequestDto { Name = "Deluxe", BasePrice = 1000, Capacity = 6, TotalRooms = 5 };

        var result = await _service.UpdateRoomTypeAsync(_roomType.Id, ManagerId, request);

        Assert.That(result.Capacity, Is.EqualTo(6));
    }

    // NOTE: SetMaintenanceModeAsync's new catch(DbUpdateConcurrencyException) block (mirroring
    // UpdateRoomTypeAsync's existing one) is exercised against a real RowVersion column on SQL
    // Server — EF Core's InMemory provider used by these tests does not simulate concurrency-token
    // conflicts, so that specific race can't be reproduced in a unit test here.
}
