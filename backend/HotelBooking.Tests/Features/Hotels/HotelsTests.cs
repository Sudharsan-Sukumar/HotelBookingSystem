using System;
using System.Linq;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Hotels.DTOs;
using HotelBooking.API.Features.Hotels.Models;
using HotelBooking.API.Features.Hotels.Services;
using HotelBooking.API.Features.Rooms.Models;
using HotelBooking.API.Features.Bookings.Models;
using Microsoft.Extensions.Caching.Memory;
using NUnit.Framework;
using HotelBooking.Tests;

namespace HotelBooking.Tests.Features.Hotels;

[TestFixture]
public class HotelsTests
{
    private ApplicationDbContext _context = null!;
    private HotelService _service = null!;

    [SetUp]
    public void SetUp()
    {
        _context = TestDbContextFactory.Create();
        _service = new HotelService(_context, new MemoryCache(new MemoryCacheOptions()), new FakeAuditLogService());
    }

    [TearDown]
    public void TearDown() => _context.Dispose();

    private async Task<Hotel> SeedHotelWithRoomType(int totalRooms, int capacity = 2, decimal basePrice = 1000m, string city = "Chennai")
    {
        var hotel = new Hotel
        {
            HotelCustomId = "HTL-TEST-0001",
            Name = "Test Hotel " + Guid.NewGuid(),
            City = city,
            IsActive = true,
            RowVersion = new byte[8]
        };
        _context.Hotels.Add(hotel);
        await _context.SaveChangesAsync();

        _context.RoomTypes.Add(new RoomType
        {
            HotelId = hotel.Id,
            Name = "Deluxe",
            BasePrice = basePrice,
            Capacity = capacity,
            TotalRooms = totalRooms,
            IsActive = true,
            RowVersion = new byte[8]
        });
        await _context.SaveChangesAsync();

        return hotel;
    }

    [Test]
    public void SearchHotelsAsync_CheckInInPast_ThrowsArgumentException()
    {
        var request = new SearchRequestDto
        {
            DestinationCity = "Chennai",
            CheckInDate = DateTime.UtcNow.Date.AddDays(-1),
            CheckOutDate = DateTime.UtcNow.Date.AddDays(2),
            Guests = 2
        };

        Assert.ThrowsAsync<ArgumentException>(() => _service.SearchHotelsAsync(request));
    }

    [Test]
    public void SearchHotelsAsync_CheckOutBeforeCheckIn_ThrowsArgumentException()
    {
        var request = new SearchRequestDto
        {
            DestinationCity = "Chennai",
            CheckInDate = DateTime.UtcNow.Date.AddDays(3),
            CheckOutDate = DateTime.UtcNow.Date.AddDays(1),
            Guests = 2
        };

        Assert.ThrowsAsync<ArgumentException>(() => _service.SearchHotelsAsync(request));
    }

    [Test]
    public async Task SearchHotelsAsync_RoomAvailable_ReturnsHotelAsAvailable()
    {
        await SeedHotelWithRoomType(totalRooms: 5);

        var request = new SearchRequestDto
        {
            DestinationCity = "Chennai",
            CheckInDate = DateTime.UtcNow.Date.AddDays(1),
            CheckOutDate = DateTime.UtcNow.Date.AddDays(3),
            Guests = 2
        };

        var results = (await _service.SearchHotelsAsync(request)).ToList();

        Assert.That(results, Has.Count.EqualTo(1));
        Assert.That(results[0].IsAvailable, Is.True);
    }

    [Test]
    public async Task SearchHotelsAsync_AllRoomsBooked_ExcludesHotelFromResults()
    {
        var hotel = await SeedHotelWithRoomType(totalRooms: 1);
        var roomType = _context.RoomTypes.First(rt => rt.HotelId == hotel.Id);

        _context.Bookings.Add(new Booking
        {
            BookingCustomId = "BK-TEST-0001",
            UserId = 1,
            HotelId = hotel.Id,
            RoomTypeId = roomType.Id,
            CheckInDate = DateTime.UtcNow.Date.AddDays(1),
            CheckOutDate = DateTime.UtcNow.Date.AddDays(3),
            NumberOfRooms = 1,
            Status = "Confirmed",
            RowVersion = new byte[8]
        });
        await _context.SaveChangesAsync();

        var request = new SearchRequestDto
        {
            DestinationCity = "Chennai",
            CheckInDate = DateTime.UtcNow.Date.AddDays(1),
            CheckOutDate = DateTime.UtcNow.Date.AddDays(3),
            Guests = 2
        };

        var results = (await _service.SearchHotelsAsync(request)).ToList();

        Assert.That(results, Is.Empty);
    }

    [Test]
    public async Task SearchHotelsAsync_MoreResultsThanPageSize_ReturnsOnlyOnePage()
    {
        for (int i = 0; i < 3; i++)
        {
            await SeedHotelWithRoomType(totalRooms: 5);
        }

        var request = new SearchRequestDto
        {
            DestinationCity = "Chennai",
            CheckInDate = DateTime.UtcNow.Date.AddDays(1),
            CheckOutDate = DateTime.UtcNow.Date.AddDays(3),
            Guests = 2,
            PageNumber = 1,
            PageSize = 2
        };

        var results = (await _service.SearchHotelsAsync(request)).ToList();

        Assert.That(results, Has.Count.EqualTo(2));
    }
}
