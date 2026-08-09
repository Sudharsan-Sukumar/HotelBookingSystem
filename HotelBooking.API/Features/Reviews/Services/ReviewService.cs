using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Reviews.DTOs;
using HotelBooking.API.Features.Reviews.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.API.Features.Reviews.Services;

public class ReviewService : IReviewService
{
    private readonly ApplicationDbContext _context;

    public ReviewService(ApplicationDbContext context)
    {
        _context = context;
    }

    private async Task UpdateHotelStarRatingAsync(int hotelId)
    {
        var hotel = await _context.Hotels.FindAsync(hotelId);
        if (hotel == null) return;

        var reviews = await _context.Reviews
            .Where(r => r.HotelId == hotelId && !r.IsDeleted)
            .ToListAsync();

        hotel.ReviewCount = reviews.Count;
        hotel.AverageRating = reviews.Count > 0 ? (decimal)reviews.Average(r => r.Rating) : 0;
        await _context.SaveChangesAsync();
    }

    public async Task<Review> SubmitReviewAsync(int customerId, ReviewCreateDto request)
    {
        var booking = await _context.Bookings.FindAsync(request.BookingId);
        if (booking == null)
            throw new ArgumentException("Booking not found.");

        if (booking.UserId != customerId)
            throw new UnauthorizedAccessException("You can only review your own bookings.");

        if (booking.Status != "Completed")
            throw new InvalidOperationException("You can only review completed stays.");

        var existingReview = await _context.Reviews
            .FirstOrDefaultAsync(r => r.BookingId == request.BookingId && !r.IsDeleted);
        if (existingReview != null)
            throw new InvalidOperationException("You have already submitted a review for this booking.");

        var review = new Review
        {
            BookingId = request.BookingId,
            CustomerId = customerId,
            HotelId = booking.HotelId,
            Rating = request.Rating,
            Comment = request.Comment,
            IsDeleted = false
        };

        _context.Reviews.Add(review);
        await _context.SaveChangesAsync();

        await UpdateHotelStarRatingAsync(booking.HotelId);

        return review;
    }

    public async Task<IEnumerable<Review>> GetHotelReviewsAsync(int hotelId)
    {
        return await _context.Reviews
            .Include(r => r.Customer)
            .Where(r => r.HotelId == hotelId && !r.IsDeleted)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();
    }

    public async Task<Review> RespondToReviewAsync(int reviewId, ManagerResponseDto request)
    {
        var review = await _context.Reviews.FindAsync(reviewId);
        if (review == null || review.IsDeleted)
            throw new ArgumentException("Review not found.");

        if (!string.IsNullOrEmpty(review.ManagerResponse))
            throw new InvalidOperationException("You have already responded to this review. You may edit your existing response.");

        review.ManagerResponse = request.Response;
        review.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return review;
    }

    public async Task DeleteReviewAsync(int reviewId)
    {
        var review = await _context.Reviews.FindAsync(reviewId);
        if (review != null && !review.IsDeleted)
        {
            review.IsDeleted = true;
            review.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            await UpdateHotelStarRatingAsync(review.HotelId);
        }
    }
}
