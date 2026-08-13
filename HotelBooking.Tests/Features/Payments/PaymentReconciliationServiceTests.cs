using System;
using System.Threading;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Bookings.Models;
using HotelBooking.API.Features.CMS.Services;
using HotelBooking.API.Features.Payments.Models;
using HotelBooking.API.Features.Payments.Services;
using HotelBooking.API.Users.Models;
using HotelBooking.API.Users.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NUnit.Framework;

namespace HotelBooking.Tests.Features.Payments;

[TestFixture]
public class PaymentReconciliationServiceTests
{
    private ServiceProvider _provider = null!;
    private FakeRazorpayApiClient _fakeApiClient = null!;
    private PaymentReconciliationService _reconciliationService = null!;
    private int _userId;
    private int _bookingId;
    private int _paymentId;

    [SetUp]
    public void SetUp()
    {
        var dbName = Guid.NewGuid().ToString();

        var services = new ServiceCollection();
        services.AddLogging();
        services.AddDbContext<ApplicationDbContext>(options =>
            options.UseInMemoryDatabase(dbName)
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning)));

        _fakeApiClient = new FakeRazorpayApiClient();
        services.AddSingleton<IRazorpayApiClient>(_fakeApiClient);
        services.AddSingleton<INotificationQueue>(new FakeNotificationQueue());
        services.AddSingleton<IAuditLogService>(new FakeAuditLogService());
        services.AddSingleton(Options.Create(new RazorpayOptions { KeyId = "x", KeySecret = "y", WebhookSecret = "z" }));
        services.AddScoped<IRazorpayPaymentService, RazorpayPaymentService>();

        _provider = services.BuildServiceProvider();

        _reconciliationService = new PaymentReconciliationService(
            _provider.GetRequiredService<IServiceScopeFactory>(), NullLogger<PaymentReconciliationService>.Instance);

        // Seed via a throwaway scope so nothing here stays tracked in a long-lived context —
        // every assertion below opens its OWN fresh scope/context to read back real committed
        // state, rather than risking EF's identity map handing back a stale in-process object.
        using var seedScope = _provider.CreateScope();
        var seedContext = seedScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        seedContext.Roles.Add(new Role { Id = 2, Name = "Customer" });
        var user = new User
        {
            FirstName = "Reconcile", LastName = "Tester", Email = "reconcile@hbs.local",
            Phone = "9876533333", PasswordHash = "irrelevant", RoleId = 2, Status = "Active"
        };
        seedContext.Users.Add(user);
        seedContext.SaveChanges();
        _userId = user.Id;

        var booking = new Booking
        {
            BookingCustomId = "", UserId = user.Id, HotelId = 1, RoomTypeId = 1,
            CheckInDate = DateTime.UtcNow.AddDays(5), CheckOutDate = DateTime.UtcNow.AddDays(7),
            NumberOfRooms = 1, TotalAmount = 1000, Status = "Pending Payment", RowVersion = new byte[8]
        };
        seedContext.Bookings.Add(booking);
        seedContext.SaveChanges();
        _bookingId = booking.Id;

        var payment = new RazorpayPayment
        {
            Reference = "ref-stale-1",
            BookingId = booking.Id,
            PhoneNumber = user.Phone,
            Amount = 1000,
            Currency = "INR",
            RazorpayPaymentLinkId = "plink_stale_1",
            Status = "Created",
            CreatedAt = DateTime.UtcNow.AddMinutes(-30) // older than the 20-minute staleness threshold
        };
        seedContext.RazorpayPayments.Add(payment);
        seedContext.SaveChanges();
        _paymentId = payment.Id;
    }

    [TearDown]
    public void TearDown()
    {
        _reconciliationService.Dispose();
        _provider.Dispose();
    }

    private async Task RunOneReconciliationPassAsync()
    {
        var method = typeof(PaymentReconciliationService).GetMethod("ReconcileOnceAsync",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        await (Task)method.Invoke(_reconciliationService, new object[] { CancellationToken.None })!;
    }

    private async Task<(string BookingStatus, string PaymentStatus)> ReadStateAsync()
    {
        using var scope = _provider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var booking = await context.Bookings.AsNoTracking().FirstAsync(b => b.Id == _bookingId);
        var payment = await context.RazorpayPayments.AsNoTracking().FirstAsync(p => p.Id == _paymentId);
        return (booking.Status, payment.Status);
    }

    [Test]
    public async Task ReconcileOnceAsync_StaleLinkActuallyPaidAtRazorpay_ConfirmsBookingLocally()
    {
        // Customer Edge Case #4: payment succeeded at Razorpay but the webhook never arrived
        // (server crashed / delivery lost) — reconciliation must catch it independently.
        _fakeApiClient.StatusToReturn = "paid";

        await RunOneReconciliationPassAsync();

        var (bookingStatus, paymentStatus) = await ReadStateAsync();
        Assert.That(bookingStatus, Is.EqualTo("Confirmed"));
        Assert.That(paymentStatus, Is.EqualTo("Paid"));
    }

    [Test]
    public async Task ReconcileOnceAsync_StaleLinkExpiredAtRazorpay_MarksFailedWithoutConfirming()
    {
        _fakeApiClient.StatusToReturn = "expired";

        await RunOneReconciliationPassAsync();

        var (bookingStatus, paymentStatus) = await ReadStateAsync();
        Assert.That(bookingStatus, Is.EqualTo("Pending Payment")); // never confirmed
        Assert.That(paymentStatus, Is.EqualTo("Failed"));
    }

    [Test]
    public async Task ReconcileOnceAsync_LinkNotYetStale_IsIgnored()
    {
        using (var scope = _provider.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var payment = await context.RazorpayPayments.FirstAsync(p => p.Id == _paymentId);
            payment.CreatedAt = DateTime.UtcNow.AddMinutes(-2); // well within a normal payment session
            await context.SaveChangesAsync();
        }

        _fakeApiClient.StatusToReturn = "paid";

        await RunOneReconciliationPassAsync();

        Assert.That(_fakeApiClient.StatusCheckCallCount, Is.EqualTo(0)); // never even asked Razorpay
        var (bookingStatus, _) = await ReadStateAsync();
        Assert.That(bookingStatus, Is.EqualTo("Pending Payment"));
    }
}
