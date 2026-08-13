using System;
using System.Threading.Tasks;
using HotelBooking.API.Features.Bookings.Models;
using HotelBooking.API.Features.Hotels.Models;
using HotelBooking.API.Features.Reviews.DTOs;
using HotelBooking.API.Features.Reviews.Services;
using NUnit.Framework;

namespace HotelBooking.Tests.Features.Reviews;

[TestFixture]
public class ReviewsTests
{
    private HotelBooking.API.Data.ApplicationDbContext _context = null!;
    private ReviewService _service = null!;
    private Booking _booking = null!;

    [SetUp]
    public void SetUp()
    {
        _context = TestDbContextFactory.Create();
        _service = new ReviewService(_context, new FakeAuditLogService());

        var hotel = new Hotel { Name = "Review Hotel", City = "Chennai", RowVersion = new byte[8] };
        _context.Hotels.Add(hotel);
        _context.SaveChanges();

        _booking = new Booking
        {
            BookingCustomId = "BK-TEST-0001",
            UserId = 10,
            HotelId = hotel.Id,
            RoomTypeId = 1,
            CheckInDate = DateTime.UtcNow.AddDays(-5),
            CheckOutDate = DateTime.UtcNow.AddDays(-2),
            NumberOfRooms = 1,
            Status = "Completed",
            RowVersion = new byte[8]
        };
        _context.Bookings.Add(_booking);
        _context.SaveChanges();
    }

    [TearDown]
    public void TearDown() => _context.Dispose();

    [Test]
    public void SubmitReviewAsync_BookingNotCompleted_ThrowsInvalidOperationException()
    {
        _booking.Status = "Confirmed";
        _context.SaveChanges();

        var dto = new ReviewCreateDto { BookingId = _booking.Id, Rating = 5, Comment = "Great stay" };

        Assert.ThrowsAsync<InvalidOperationException>(() => _service.SubmitReviewAsync(_booking.UserId, dto));
    }

    [Test]
    public void SubmitReviewAsync_NotOwnBooking_ThrowsUnauthorizedAccessException()
    {
        var dto = new ReviewCreateDto { BookingId = _booking.Id, Rating = 5, Comment = "Great stay" };

        Assert.ThrowsAsync<UnauthorizedAccessException>(() => _service.SubmitReviewAsync(999, dto));
    }

    [Test]
    public async Task SubmitReviewAsync_ValidCompletedBooking_CreatesReviewAndUpdatesHotelRating()
    {
        var dto = new ReviewCreateDto { BookingId = _booking.Id, Rating = 4, Comment = "Nice" };

        var review = await _service.SubmitReviewAsync(_booking.UserId, dto);

        Assert.That(review.Id, Is.GreaterThan(0));
        var hotel = await _context.Hotels.FindAsync(_booking.HotelId);
        Assert.That(hotel!.AverageRating, Is.EqualTo(4));
    }
}
