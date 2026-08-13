using System;
using System.Threading.Tasks;
using HotelBooking.API.Features.Bookings.Models;
using HotelBooking.API.Features.Hotels.Models;
using HotelBooking.API.Features.Reports.Services;
using HotelBooking.API.Features.Rooms.Models;
using NUnit.Framework;

namespace HotelBooking.Tests.Features.Reports;

[TestFixture]
public class ReportsTests
{
    private HotelBooking.API.Data.ApplicationDbContext _context = null!;
    private ReportService _service = null!;

    [SetUp]
    public void SetUp()
    {
        _context = TestDbContextFactory.Create();
        _service = new ReportService(_context);
    }

    [TearDown]
    public void TearDown() => _context.Dispose();

    [Test]
    public async Task IsManagerOfHotelAsync_UserInManagerIds_ReturnsTrue()
    {
        var hotel = new Hotel { Name = "Test Hotel", City = "Chennai", RowVersion = new byte[8] };
        hotel.ManagerIds.Add(42);
        _context.Hotels.Add(hotel);
        await _context.SaveChangesAsync();

        var result = await _service.IsManagerOfHotelAsync(42, hotel.Id);

        Assert.That(result, Is.True);
    }

    [Test]
    public async Task IsManagerOfHotelAsync_UserNotInManagerIds_ReturnsFalse()
    {
        var hotel = new Hotel { Name = "Test Hotel 2", City = "Chennai", RowVersion = new byte[8] };
        hotel.ManagerIds.Add(42);
        _context.Hotels.Add(hotel);
        await _context.SaveChangesAsync();

        var result = await _service.IsManagerOfHotelAsync(99, hotel.Id);

        Assert.That(result, Is.False);
    }

    [Test]
    public async Task GetHotelReservationsReportAsync_PaginatesDetailRows_ButAggregatesCoverFullSet()
    {
        // Admin Edge Case #16: aggregates (TotalBookings/TotalRevenue) must reflect the FULL
        // filtered set even when only one page of detail rows is requested.
        var hotel = new Hotel { Name = "Paginated Hotel", City = "Chennai", RowVersion = new byte[8] };
        _context.Hotels.Add(hotel);
        await _context.SaveChangesAsync();

        var roomType = new RoomType { HotelId = hotel.Id, Name = "Standard", BasePrice = 1000, Capacity = 2, TotalRooms = 50, RowVersion = new byte[8] };
        _context.RoomTypes.Add(roomType);

        _context.Roles.Add(new HotelBooking.API.Users.Models.Role { Id = 2, Name = "Customer" });
        var user = new HotelBooking.API.Users.Models.User
        {
            FirstName = "Report", LastName = "Customer", Email = "reportcustomer@hbs.local",
            Phone = "9876544444", PasswordHash = "irrelevant", RoleId = 2, Status = "Active"
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        for (var i = 0; i < 5; i++)
        {
            _context.Bookings.Add(new Booking
            {
                BookingCustomId = $"BK-PG-{i}",
                UserId = user.Id,
                HotelId = hotel.Id,
                RoomTypeId = roomType.Id,
                CheckInDate = DateTime.UtcNow.AddDays(10 + i),
                CheckOutDate = DateTime.UtcNow.AddDays(12 + i),
                NumberOfRooms = 1,
                TotalAmount = 1000,
                Status = "Confirmed",
                RowVersion = new byte[8]
            });
        }
        await _context.SaveChangesAsync();

        var page1 = await _service.GetHotelReservationsReportAsync(hotel.Id, null, null, null, page: 1, pageSize: 2);

        Assert.That(page1.TotalBookings, Is.EqualTo(5));       // full-set aggregate
        Assert.That(page1.TotalRevenue, Is.EqualTo(5000));     // full-set aggregate
        Assert.That(page1.Reservations, Has.Count.EqualTo(2)); // only this page's rows
        Assert.That(page1.Page, Is.EqualTo(1));
        Assert.That(page1.PageSize, Is.EqualTo(2));

        var page3 = await _service.GetHotelReservationsReportAsync(hotel.Id, null, null, null, page: 3, pageSize: 2);
        Assert.That(page3.Reservations, Has.Count.EqualTo(1)); // last, partial page (5 rows / pageSize 2)
    }
}
