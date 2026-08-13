using System;
using System.Threading.Tasks;
using HotelBooking.API.Features.Bookings.Models;
using HotelBooking.API.Features.Hotels.Models;
using HotelBooking.API.Features.Rooms.DTOs;
using HotelBooking.API.Features.Rooms.Models;
using HotelBooking.API.Features.Rooms.Services;
using NUnit.Framework;

namespace HotelBooking.Tests.Features.Rooms;

[TestFixture]
public class RoomsTests
{
    private HotelBooking.API.Data.ApplicationDbContext _context = null!;
    private BlockedDateService _service = null!;
    private RoomType _roomType = null!;

    [SetUp]
    public void SetUp()
    {
        _context = TestDbContextFactory.Create();
        _service = new BlockedDateService(_context, new HotelBooking.Tests.FakeAuditLogService());

        var hotel = new Hotel { Name = "Rooms Hotel", City = "Chennai", RowVersion = new byte[8] };
        _context.Hotels.Add(hotel);
        _context.SaveChanges();

        _roomType = new RoomType { HotelId = hotel.Id, Name = "Standard", TotalRooms = 5, Capacity = 2, RowVersion = new byte[8] };
        _context.RoomTypes.Add(_roomType);
        _context.SaveChanges();
    }

    [TearDown]
    public void TearDown() => _context.Dispose();

    [Test]
    public void AddBlockedDateAsync_RoomTypeNotFound_ThrowsArgumentException()
    {
        var request = new BlockedDateRequestDto
        {
            RoomTypeId = 9999,
            StartDate = DateTime.UtcNow.AddDays(1),
            EndDate = DateTime.UtcNow.AddDays(3),
            Reason = "Maintenance"
        };

        Assert.ThrowsAsync<ArgumentException>(() => _service.AddBlockedDateAsync(request));
    }

    [Test]
    public void AddBlockedDateAsync_ConflictingActiveBooking_ThrowsInvalidOperationException()
    {
        _context.Bookings.Add(new Booking
        {
            BookingCustomId = "BK-TEST-0002",
            UserId = 1,
            HotelId = _roomType.HotelId,
            RoomTypeId = _roomType.Id,
            CheckInDate = DateTime.UtcNow.AddDays(2),
            CheckOutDate = DateTime.UtcNow.AddDays(4),
            NumberOfRooms = 1,
            Status = "Confirmed",
            RowVersion = new byte[8]
        });
        _context.SaveChanges();

        var request = new BlockedDateRequestDto
        {
            RoomTypeId = _roomType.Id,
            StartDate = DateTime.UtcNow.AddDays(1),
            EndDate = DateTime.UtcNow.AddDays(3),
            Reason = "Maintenance"
        };

        Assert.ThrowsAsync<InvalidOperationException>(() => _service.AddBlockedDateAsync(request));
    }

    [Test]
    public async Task AddBlockedDateAsync_NoConflict_CreatesBlockedDate()
    {
        var request = new BlockedDateRequestDto
        {
            RoomTypeId = _roomType.Id,
            StartDate = DateTime.UtcNow.AddDays(10),
            EndDate = DateTime.UtcNow.AddDays(12),
            Reason = "Renovation"
        };

        var result = await _service.AddBlockedDateAsync(request);

        Assert.That(result.Id, Is.GreaterThan(0));
    }
}
