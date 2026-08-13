using System;
using System.Linq;
using System.Threading.Tasks;
using HotelBooking.API.Common.Services;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Bookings.DTOs;
using HotelBooking.API.Features.Bookings.Services;
using HotelBooking.API.Features.CMS.Models;
using HotelBooking.API.Features.Hotels.Models;
using HotelBooking.API.Features.Rooms.Models;
using HotelBooking.API.Users.Models;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;

namespace HotelBooking.Tests.Features.Bookings;

[TestFixture]
public class BookingServicePolicyTests
{
    private ApplicationDbContext _context = null!;
    private BookingService _service = null!;
    private Hotel _hotel = null!;
    private RoomType _roomType = null!;
    private User _user = null!;

    [SetUp]
    public void SetUp()
    {
        _context = TestDbContextFactory.Create();
        _service = new BookingService(_context, new FakePricingRuleService(), new BackgroundEmailQueue(),
            new FakeAuditLogService(), new FakeNotificationQueue());

        _hotel = new Hotel { Name = "Policy Hotel", City = "Chennai", IsActive = true, RowVersion = new byte[8] };
        _context.Hotels.Add(_hotel);
        _context.SaveChanges();

        _roomType = new RoomType
        {
            HotelId = _hotel.Id, Name = "Standard", BasePrice = 1000, Capacity = 2, TotalRooms = 5,
            IsActive = true, RowVersion = new byte[8]
        };
        _context.RoomTypes.Add(_roomType);

        _context.Roles.Add(new Role { Id = 2, Name = "Customer" });
        _user = new User
        {
            FirstName = "Policy", LastName = "Tester", Email = "policytester@hbs.local",
            Phone = "9876555555", PasswordHash = "irrelevant", RoleId = 2, Status = "Active"
        };
        _context.Users.Add(_user);
        _context.SaveChanges();
    }

    [TearDown]
    public void TearDown() => _context.Dispose();

    private async Task<BookingResponseDto> CreateBookingAsync()
    {
        var request = new BookingRequestDto
        {
            HotelId = _hotel.Id,
            RoomTypeId = _roomType.Id,
            CheckInDate = DateTime.UtcNow.AddDays(10),
            CheckOutDate = DateTime.UtcNow.AddDays(12),
            NumberOfRooms = 1,
            IDProofType = "Aadhar Card",
            IDProofNumber = "1234"
        };
        return await _service.CreateBookingAsync(_user.Id, request);
    }

    [Test]
    public async Task CreateBookingAsync_NoConfiguredPolicy_SnapshotsDefaultThresholds()
    {
        var result = await CreateBookingAsync();

        var booking = await _context.Bookings.FindAsync(result.Id);
        Assert.That(booking!.FullRefundHoursThreshold, Is.EqualTo(48));
        Assert.That(booking.PartialRefundHoursThreshold, Is.EqualTo(24));
        Assert.That(booking.PartialRefundPercentage, Is.EqualTo(0.5m));
    }

    [Test]
    public async Task CreateBookingAsync_PolicyChangedAfterEarlierBooking_OldBookingKeepsOriginalSnapshot()
    {
        // Admin Edge Case #15: an admin changes the cancellation policy while a booking already
        // exists — that existing booking must keep the policy that was in effect when IT was made.
        var beforeChange = await CreateBookingAsync();

        _context.SystemSettings.Add(new SystemSetting { Key = "CancellationPolicy.FullRefundHours", Value = "72" });
        _context.SystemSettings.Add(new SystemSetting { Key = "CancellationPolicy.PartialRefundHours", Value = "36" });
        _context.SystemSettings.Add(new SystemSetting { Key = "CancellationPolicy.PartialRefundPercentage", Value = "0.25" });
        await _context.SaveChangesAsync();

        var afterChange = await CreateBookingAsync();

        var oldBooking = await _context.Bookings.FindAsync(beforeChange.Id);
        var newBooking = await _context.Bookings.FindAsync(afterChange.Id);

        Assert.That(oldBooking!.FullRefundHoursThreshold, Is.EqualTo(48));   // unaffected by the later policy change
        Assert.That(oldBooking.PartialRefundHoursThreshold, Is.EqualTo(24));
        Assert.That(oldBooking.PartialRefundPercentage, Is.EqualTo(0.5m));

        Assert.That(newBooking!.FullRefundHoursThreshold, Is.EqualTo(72));  // picks up the new policy
        Assert.That(newBooking.PartialRefundHoursThreshold, Is.EqualTo(36));
        Assert.That(newBooking.PartialRefundPercentage, Is.EqualTo(0.25m));
    }

    [Test]
    public async Task CancelBookingAsync_UsesTheBookingsOwnSnapshottedPolicy_NotTheCurrentOne()
    {
        var created = await CreateBookingAsync();

        // Simulate check-in being 40 hours away: under the ORIGINAL 24h/48h policy that's a 50%
        // partial refund window; under a since-changed 36h/72h policy it would be full-refund.
        // Refund tiers only apply to a booking that was actually paid for (QA Defect fix — cancelling
        // an unpaid booking must never refund), so mark it Confirmed to exercise that path here.
        var booking = await _context.Bookings.FindAsync(created.Id);
        booking!.CheckInDate = DateTime.UtcNow.AddHours(40);
        booking.Status = "Confirmed";
        await _context.SaveChangesAsync();

        _context.SystemSettings.Add(new SystemSetting { Key = "CancellationPolicy.FullRefundHours", Value = "72" });
        await _context.SaveChangesAsync();

        var result = await _service.CancelBookingAsync(created.Id, _user.Id);

        // Still governed by the ORIGINAL 48h threshold snapshotted at creation, not the new 72h one —
        // 40h < 48h (FullRefundHoursThreshold) and >= 24h (PartialRefundHoursThreshold) → 50% refund.
        Assert.That(result.TotalAmount, Is.GreaterThan(0));
        var refund = _context.Refunds.First(r => r.BookingId == created.Id);
        Assert.That(refund.Amount, Is.EqualTo(created.TotalAmount * 0.5m));
    }

    [Test]
    public async Task CancelBookingAsync_BookingNeverPaid_IssuesNoRefundAndCreatesNoRefundRow()
    {
        // QA Defect (Critical) regression test: a booking still "Pending Payment" was never
        // actually paid for — cancelling it (even well outside the 24h no-refund window) must not
        // credit the wallet or create a Refund row. Previously this minted free wallet balance.
        var created = await CreateBookingAsync(); // stays "Pending Payment" — never confirmed/paid

        var walletBefore = (await _context.Users.FindAsync(_user.Id))!.WalletBalance;

        var result = await _service.CancelBookingAsync(created.Id, _user.Id);

        Assert.That(result.Status, Is.EqualTo("Cancelled"));

        var walletAfter = (await _context.Users.FindAsync(_user.Id))!.WalletBalance;
        Assert.That(walletAfter, Is.EqualTo(walletBefore)); // unchanged — no free money

        var refundExists = await _context.Refunds.AnyAsync(r => r.BookingId == created.Id);
        Assert.That(refundExists, Is.False);
    }

    [Test]
    public async Task AdminCancelBookingAsync_BookingNeverPaid_IssuesNoRefund()
    {
        var created = await CreateBookingAsync();
        var walletBefore = (await _context.Users.FindAsync(_user.Id))!.WalletBalance;

        var result = await _service.AdminCancelBookingAsync(created.Id, "QA regression test cancellation", adminUserId: 999);

        Assert.That(result.Status, Is.EqualTo("Cancelled"));
        var walletAfter = (await _context.Users.FindAsync(_user.Id))!.WalletBalance;
        Assert.That(walletAfter, Is.EqualTo(walletBefore));

        var refundExists = await _context.Refunds.AnyAsync(r => r.BookingId == created.Id);
        Assert.That(refundExists, Is.False);
    }
}
