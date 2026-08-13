using System;
using System.Threading.Tasks;
using HotelBooking.API.Features.Bookings.Models;
using HotelBooking.API.Features.Payments.DTOs;
using HotelBooking.API.Features.Payments.Services;
using HotelBooking.API.Users.Models;
using NUnit.Framework;

namespace HotelBooking.Tests.Features.Payments;

[TestFixture]
public class RefundServiceTests
{
    private HotelBooking.API.Data.ApplicationDbContext _context = null!;
    private RefundService _service = null!;
    private FakeNotificationQueue _notificationQueue = null!;
    private User _user = null!;
    private Booking _booking = null!;

    [SetUp]
    public void SetUp()
    {
        _context = TestDbContextFactory.Create();
        _notificationQueue = new FakeNotificationQueue();
        _service = new RefundService(_context, new FakeAuditLogService(), _notificationQueue);

        _context.Roles.Add(new Role { Id = 2, Name = "Customer" });
        _user = new User
        {
            FirstName = "Refund",
            LastName = "Tester",
            Email = "refundtester@hbs.local",
            Phone = "9876522222",
            PasswordHash = "irrelevant",
            RoleId = 2,
            Status = "Active",
            WalletBalance = 0
        };
        _context.Users.Add(_user);
        _context.SaveChanges();

        _booking = new Booking
        {
            BookingCustomId = "BKG-TEST-0001",
            UserId = _user.Id,
            HotelId = 1,
            RoomTypeId = 1,
            CheckInDate = DateTime.UtcNow.AddDays(5),
            CheckOutDate = DateTime.UtcNow.AddDays(7),
            NumberOfRooms = 1,
            TotalAmount = 1000,
            Status = "Cancelled",
            RowVersion = new byte[8]
        };
        _context.Bookings.Add(_booking);
        _context.SaveChanges();
    }

    [TearDown]
    public void TearDown() => _context.Dispose();

    [Test]
    public async Task AdminOverrideRefundAsync_FirstCall_CreditsWalletAndRecordsRefund()
    {
        var dto = new AdminRefundOverrideDto { BookingId = _booking.Id, Amount = 500, Reason = "Goodwill gesture" };

        var result = await _service.AdminOverrideRefundAsync(dto, adminUserId: 99);

        Assert.That(result.Amount, Is.EqualTo(500));
        var user = await _context.Users.FindAsync(_user.Id);
        Assert.That(user!.WalletBalance, Is.EqualTo(500));
        Assert.That(_notificationQueue.Queued, Has.Count.EqualTo(1));
    }

    [Test]
    public async Task AdminOverrideRefundAsync_SecondCallForSameBooking_ThrowsInvalidOperationException()
    {
        var dto = new AdminRefundOverrideDto { BookingId = _booking.Id, Amount = 500, Reason = "Goodwill gesture" };
        await _service.AdminOverrideRefundAsync(dto, adminUserId: 99);

        // Admin Edge Case #13 / Customer #20: a second refund attempt for the same booking —
        // whether a genuine double-submit or a different admin — must be rejected, not double-credit.
        var secondDto = new AdminRefundOverrideDto { BookingId = _booking.Id, Amount = 300, Reason = "Second attempt" };
        Assert.ThrowsAsync<InvalidOperationException>(() => _service.AdminOverrideRefundAsync(secondDto, adminUserId: 100));

        var user = await _context.Users.FindAsync(_user.Id);
        Assert.That(user!.WalletBalance, Is.EqualTo(500)); // unchanged by the rejected second attempt
    }

    [Test]
    public void AdminOverrideRefundAsync_BookingNotFound_ThrowsArgumentException()
    {
        var dto = new AdminRefundOverrideDto { BookingId = 999999, Amount = 100, Reason = "N/A" };

        Assert.ThrowsAsync<ArgumentException>(() => _service.AdminOverrideRefundAsync(dto, adminUserId: 99));
    }
}
