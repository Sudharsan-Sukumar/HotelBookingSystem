using System;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Bookings.Models;
using HotelBooking.API.Features.Payments.DTOs;
using HotelBooking.API.Features.Payments.Services;
using HotelBooking.API.Users.Models;
using HotelBooking.API.Users.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NUnit.Framework;
using HotelBooking.Tests;

namespace HotelBooking.Tests.Features.Payments;

[TestFixture]
public class PaymentsTests
{
    private ApplicationDbContext _context = null!;
    private RazorpayPaymentService _service = null!;
    private FakeRazorpayApiClient _fakeApiClient = null!;
    private FakeNotificationQueue _notificationQueue = null!;
    private FakeAuditLogService _auditLogService = null!;
    private User _user = null!;
    private Booking _booking = null!;

    [SetUp]
    public void SetUp()
    {
        _context = TestDbContextFactory.Create();

        var options = Options.Create(new RazorpayOptions
        {
            KeyId = "rzp_test_fake",
            KeySecret = "test_key_secret",
            WebhookSecret = "webhook_secret"
        });

        _fakeApiClient = new FakeRazorpayApiClient();
        _notificationQueue = new FakeNotificationQueue();
        _auditLogService = new FakeAuditLogService();
        _service = new RazorpayPaymentService(_context, _fakeApiClient, options, _notificationQueue,
            _auditLogService, NullLogger<RazorpayPaymentService>.Instance);

        _context.Roles.Add(new Role { Id = 2, Name = "Customer" });
        _user = new User
        {
            FirstName = "Pay",
            LastName = "Tester",
            Email = "paytester@hbs.local",
            Phone = "9876543210",
            PasswordHash = "irrelevant",
            RoleId = 2,
            Status = "Active",
            WalletBalance = 200
        };
        _context.Users.Add(_user);
        _context.SaveChanges();

        _booking = new Booking
        {
            BookingCustomId = "",
            UserId = _user.Id,
            HotelId = 1,
            RoomTypeId = 1,
            CheckInDate = DateTime.UtcNow.AddDays(5),
            CheckOutDate = DateTime.UtcNow.AddDays(7),
            NumberOfRooms = 1,
            TotalAmount = 1000,
            WalletAmountUsed = 0,
            Status = "Pending Payment",
            RowVersion = new byte[8]
        };
        _context.Bookings.Add(_booking);
        _context.SaveChanges();
    }

    [TearDown]
    public void TearDown() => _context.Dispose();

    [Test]
    public void CreatePaymentLinkAsync_BookingNotFound_ThrowsArgumentException()
    {
        var dto = new CreatePaymentLinkDto { BookingId = 9999, PaymentMethod = "Net Banking", AmountToPay = 1000 };

        Assert.ThrowsAsync<ArgumentException>(() => _service.CreatePaymentLinkAsync(_user.Id, dto));
    }

    [Test]
    public void CreatePaymentLinkAsync_IncorrectAmount_ThrowsInvalidOperationException()
    {
        // BUG-003 fix (RazorpayPaymentService.CreatePaymentLinkAsync): a wrong AmountToPay is a
        // client input-validation failure, not a "resource not found" case — routes to the
        // controller's 400 BadRequest catch clause via InvalidOperationException, not ArgumentException.
        var dto = new CreatePaymentLinkDto { BookingId = _booking.Id, PaymentMethod = "Net Banking", AmountToPay = 500 };

        Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreatePaymentLinkAsync(_user.Id, dto));
    }

    [Test]
    public async Task CreatePaymentLinkAsync_FullyCoveredByWallet_ConfirmsBookingImmediatelyWithoutRazorpayCall()
    {
        _booking.TotalAmount = 150; // less than the seeded 200 wallet balance
        await _context.SaveChangesAsync();

        var dto = new CreatePaymentLinkDto { BookingId = _booking.Id, PaymentMethod = "Wallet", AmountToPay = 0, UseWalletBalance = true };

        var result = await _service.CreatePaymentLinkAsync(_user.Id, dto);

        Assert.That(result.PaymentUrl, Is.Empty);
        Assert.That(_fakeApiClient.LastReferenceId, Is.Null);

        var booking = await _context.Bookings.FindAsync(_booking.Id);
        Assert.That(booking!.Status, Is.EqualTo("Confirmed"));
        Assert.That(booking.BookingCustomId, Is.Not.Empty);

        var user = await _context.Users.FindAsync(_user.Id);
        Assert.That(user!.WalletBalance, Is.EqualTo(50));

        // The booking-confirmed notification is queued, not written synchronously to the DB —
        // the caller's request never waits on notification persistence.
        Assert.That(_notificationQueue.Queued, Has.Count.EqualTo(1));
        Assert.That(_notificationQueue.Queued[0].UserId, Is.EqualTo(_user.Id));
        Assert.That(_notificationQueue.Queued[0].Type, Is.EqualTo("BookingConfirmed"));

        // Payment confirmation is a business/financial operation — it must land in the AuditLogs
        // table (via IAuditLogService), not just the notification queue.
        Assert.That(_auditLogService.LoggedActions, Has.Count.EqualTo(1));
        Assert.That(_auditLogService.LoggedActions[0].EntityName, Is.EqualTo("Payment"));
        Assert.That(_auditLogService.LoggedActions[0].Action, Is.EqualTo("PaymentConfirmed"));
    }

    [Test]
    public async Task CreatePaymentLinkAsync_PartialWallet_CreatesLinkForOutstandingOnly()
    {
        var dto = new CreatePaymentLinkDto { BookingId = _booking.Id, PaymentMethod = "Net Banking", AmountToPay = 800, UseWalletBalance = true };

        var result = await _service.CreatePaymentLinkAsync(_user.Id, dto);

        Assert.That(result.Amount, Is.EqualTo(800));
        Assert.That(_fakeApiClient.LastReferenceId, Does.StartWith(_booking.Id + "-"));

        var record = await _context.RazorpayPayments.FirstAsync();
        Assert.That(record.BookingId, Is.EqualTo(_booking.Id));
        Assert.That(record.WalletAmountApplied, Is.EqualTo(200));

        // Wallet is NOT deducted yet — only applied once the payment actually confirms.
        var user = await _context.Users.FindAsync(_user.Id);
        Assert.That(user!.WalletBalance, Is.EqualTo(200));
    }

    [Test]
    public async Task HandleWebhookEventAsync_PaymentCaptured_ConfirmsBookingAndAppliesWallet()
    {
        var linkDto = new CreatePaymentLinkDto { BookingId = _booking.Id, PaymentMethod = "Net Banking", AmountToPay = 800, UseWalletBalance = true };
        await _service.CreatePaymentLinkAsync(_user.Id, linkDto);
        var razorpayReference = _fakeApiClient.LastReferenceId!;

        await _service.HandleWebhookEventAsync("payment_link.paid", "pay_fake_1", null, razorpayReference);

        var booking = await _context.Bookings.FindAsync(_booking.Id);
        Assert.That(booking!.Status, Is.EqualTo("Confirmed"));

        var user = await _context.Users.FindAsync(_user.Id);
        Assert.That(user!.WalletBalance, Is.EqualTo(0));

        var status = await _service.GetStatusByReferenceAsync(razorpayReference);
        Assert.That(status!.Status, Is.EqualTo("Paid"));

        Assert.That(_notificationQueue.Queued.Exists(n => n.UserId == _user.Id && n.Type == "BookingConfirmed"), Is.True);
        Assert.That(_auditLogService.LoggedActions.Exists(a => a.Action == "PaymentConfirmed"), Is.True);
    }

    [Test]
    public async Task HandleWebhookEventAsync_UnknownReference_DoesNothing()
    {
        await _service.HandleWebhookEventAsync("payment_link.paid", "pay_x", null, "does-not-exist");

        var booking = await _context.Bookings.FindAsync(_booking.Id);
        Assert.That(booking!.Status, Is.EqualTo("Pending Payment"));
        Assert.That(_notificationQueue.Queued, Is.Empty);
        Assert.That(_auditLogService.LoggedActions, Is.Empty);
    }

    [Test]
    public async Task HandleWebhookEventAsync_PaymentFailed_QueuesPaymentFailedNotification()
    {
        var linkDto = new CreatePaymentLinkDto { BookingId = _booking.Id, PaymentMethod = "Net Banking", AmountToPay = 1000 };
        await _service.CreatePaymentLinkAsync(_user.Id, linkDto);
        var razorpayReference = _fakeApiClient.LastReferenceId!;

        await _service.HandleWebhookEventAsync("payment.failed", null, "Insufficient funds", razorpayReference);

        var booking = await _context.Bookings.FindAsync(_booking.Id);
        Assert.That(booking!.Status, Is.EqualTo("Pending Payment")); // booking itself is untouched by a failed payment

        Assert.That(_notificationQueue.Queued, Has.Count.EqualTo(1));
        Assert.That(_notificationQueue.Queued[0].UserId, Is.EqualTo(_user.Id));
        Assert.That(_notificationQueue.Queued[0].Type, Is.EqualTo("PaymentFailed"));
        Assert.That(_notificationQueue.Queued[0].Message, Does.Contain("Insufficient funds"));

        Assert.That(_auditLogService.LoggedActions, Has.Count.EqualTo(1));
        Assert.That(_auditLogService.LoggedActions[0].Action, Is.EqualTo("PaymentFailed"));
    }

    [Test]
    public async Task CreatePaymentLinkAsync_CalledTwiceForSameBooking_ReturnsSameLinkInsteadOfCreatingTwo()
    {
        // Customer Edge Cases #2/#3: page refresh / double Pay-Now click.
        var dto = new CreatePaymentLinkDto { BookingId = _booking.Id, PaymentMethod = "Net Banking", AmountToPay = 1000 };

        var first = await _service.CreatePaymentLinkAsync(_user.Id, dto);
        var second = await _service.CreatePaymentLinkAsync(_user.Id, dto);

        Assert.That(second.Reference, Is.EqualTo(first.Reference));
        Assert.That(await _context.RazorpayPayments.CountAsync(), Is.EqualTo(1));
        Assert.That(_fakeApiClient.CallCount, Is.EqualTo(1)); // Razorpay was only ever called once
    }

    [Test]
    public async Task HandleWebhookEventAsync_PaymentArrivesAfterSessionExpired_AutoRefundsInsteadOfConfirming()
    {
        var linkDto = new CreatePaymentLinkDto { BookingId = _booking.Id, PaymentMethod = "Net Banking", AmountToPay = 1000 };
        await _service.CreatePaymentLinkAsync(_user.Id, linkDto);
        var razorpayReference = _fakeApiClient.LastReferenceId!;

        // Customer Edge Case #22: the payment session lapses before Razorpay's "paid" webhook arrives
        // (e.g. a late/stale checkout completion).
        var booking = await _context.Bookings.FindAsync(_booking.Id);
        booking!.PaymentSessionExpiresAt = DateTime.UtcNow.AddMinutes(-5);
        await _context.SaveChangesAsync();

        await _service.HandleWebhookEventAsync("payment_link.paid", "pay_late_1", null, razorpayReference);

        var reloaded = await _context.Bookings.FindAsync(_booking.Id);
        Assert.That(reloaded!.Status, Is.EqualTo("Pending Payment")); // never confirmed

        var user = await _context.Users.FindAsync(_user.Id);
        Assert.That(user!.WalletBalance, Is.EqualTo(200 + 1000)); // pre-existing wallet balance + auto-refund

        Assert.That(_notificationQueue.Queued.Exists(n => n.Type == "PaymentSessionExpired"), Is.True);
        Assert.That(_auditLogService.LoggedActions.Exists(a => a.Action == "PaymentAutoRefunded"), Is.True);
    }

    [Test]
    public async Task GetStatusByReferenceAsync_WhenNoRecordExists_ReturnsNull()
    {
        var status = await _service.GetStatusByReferenceAsync("NO_SUCH_REFERENCE");

        Assert.That(status, Is.Null);
    }

    // Split-Payment Fallback tests — a fresh service instance with a deliberately low
    // MaxPaymentLinkAmount stands in for a Razorpay account whose single-link cap is below the
    // booking's total, without needing to hit Razorpay's real 400 "amount exceeds maximum amount
    // allowed" response to exercise the fallback.
    private RazorpayPaymentService BuildServiceWithLowLinkCap(decimal maxPaymentLinkAmount)
    {
        var options = Options.Create(new RazorpayOptions
        {
            KeyId = "rzp_test_fake",
            KeySecret = "test_key_secret",
            WebhookSecret = "webhook_secret",
            MaxPaymentLinkAmount = maxPaymentLinkAmount
        });
        return new RazorpayPaymentService(_context, _fakeApiClient, options, _notificationQueue,
            _auditLogService, NullLogger<RazorpayPaymentService>.Instance);
    }

    [Test]
    public async Task CreatePaymentLinkAsync_OutstandingExceedsMaxLinkAmount_CapsLinkAndReportsRemainder()
    {
        var service = BuildServiceWithLowLinkCap(600);
        var dto = new CreatePaymentLinkDto { BookingId = _booking.Id, PaymentMethod = "Net Banking", AmountToPay = 1000 };

        var result = await service.CreatePaymentLinkAsync(_user.Id, dto);

        Assert.That(result.Amount, Is.EqualTo(600)); // capped at MaxPaymentLinkAmount, not the full 1000 outstanding
        Assert.That(result.IsPartialPayment, Is.True);
        Assert.That(result.RemainingAfterThisPayment, Is.EqualTo(400));

        var record = await _context.RazorpayPayments.FirstAsync();
        Assert.That(record.Amount, Is.EqualTo(600));
    }

    [Test]
    public async Task CreatePaymentLinkAsync_SecondChunkOfSplitPayment_CoversExactRemainder()
    {
        var service = BuildServiceWithLowLinkCap(600);
        var firstChunk = await service.CreatePaymentLinkAsync(_user.Id,
            new CreatePaymentLinkDto { BookingId = _booking.Id, PaymentMethod = "Net Banking", AmountToPay = 1000 });
        await service.HandleWebhookEventAsync("payment_link.paid", "pay_chunk_1", null, firstChunk.Reference);

        // Booking isn't fully settled yet — the first 600 of 1000 is paid, 400 still owed.
        var midway = await _context.Bookings.FindAsync(_booking.Id);
        Assert.That(midway!.Status, Is.EqualTo("Pending Additional Payment"));

        var secondChunk = await service.CreatePaymentLinkAsync(_user.Id,
            new CreatePaymentLinkDto { BookingId = _booking.Id, PaymentMethod = "Net Banking", AmountToPay = 400 });

        Assert.That(secondChunk.Amount, Is.EqualTo(400));
        Assert.That(secondChunk.IsPartialPayment, Is.False); // this chunk covers exactly what's left

        await service.HandleWebhookEventAsync("payment_link.paid", "pay_chunk_2", null, secondChunk.Reference);

        var final = await _context.Bookings.FindAsync(_booking.Id);
        Assert.That(final!.Status, Is.EqualTo("Confirmed"));

        Assert.That(_auditLogService.LoggedActions.Exists(a => a.Action == "PartialPaymentReceived"), Is.True);
        Assert.That(_auditLogService.LoggedActions.Exists(a => a.Action == "PaymentConfirmed"), Is.True);
        Assert.That(_notificationQueue.Queued.Exists(n => n.Type == "PartialPaymentReceived"), Is.True);
    }

    [Test]
    public async Task GetStatusByReferenceAsync_AfterFirstChunkPaid_ReportsPartialPaymentAndRemainder()
    {
        var service = BuildServiceWithLowLinkCap(600);
        var firstChunk = await service.CreatePaymentLinkAsync(_user.Id,
            new CreatePaymentLinkDto { BookingId = _booking.Id, PaymentMethod = "Net Banking", AmountToPay = 1000 });
        await service.HandleWebhookEventAsync("payment_link.paid", "pay_chunk_1", null, firstChunk.Reference);

        var status = await service.GetStatusByReferenceAsync(firstChunk.Reference);

        Assert.That(status!.Status, Is.EqualTo("Paid"));
        Assert.That(status.BookingStatus, Is.EqualTo("Pending Additional Payment"));
        Assert.That(status.IsPartialPayment, Is.True);
        Assert.That(status.RemainingAfterThisPayment, Is.EqualTo(400));
    }
}
