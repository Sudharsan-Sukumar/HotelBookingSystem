using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Reviews.DTOs;
using HotelBooking.API.Features.Reviews.Models;
using HotelBooking.API.Users.Services;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.API.Features.Reviews.Services;

public class ReviewService : IReviewService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public ReviewService(ApplicationDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
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

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Customer Edge Case #18: the check above is a plain check-then-insert with a race
            // window — a genuine double-submit can both pass it before either commits. The DB's own
            // unique index on (BookingId, CustomerId) is the real backstop; translate its violation
            // into the same clean error the pre-check already gives, instead of an unhandled 500.
            throw new InvalidOperationException("You have already submitted a review for this booking.");
        }

        await UpdateHotelStarRatingAsync(booking.HotelId);

        await _auditLogService.LogActionAsync(
            "Review", review.Id, "Create",
            $"Customer {customerId} submitted review {review.Id} for booking {review.BookingId}. Rating: {review.Rating}.",
            customerId);

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

        await _auditLogService.LogActionAsync(
            "Review", review.Id, "ManagerResponse",
            $"Manager responded to review {review.Id}.",
            null);

        return review;
    }

    public async Task<Review> EditOwnReviewAsync(int reviewId, int customerId, ReviewCreateDto request)
    {
        var review = await _context.Reviews.FindAsync(reviewId);
        if (review == null || review.IsDeleted)
            throw new ArgumentException("Review not found.");

        if (review.CustomerId != customerId)
            throw new UnauthorizedAccessException("You can only edit your own review.");

        review.Rating = request.Rating;
        review.Comment = request.Comment;
        review.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await UpdateHotelStarRatingAsync(review.HotelId);

        await _auditLogService.LogActionAsync(
            "Review", review.Id, "Update",
            $"Customer {customerId} edited review {review.Id}. New rating: {review.Rating}.",
            customerId);

        return review;
    }

    public async Task DeleteOwnReviewAsync(int reviewId, int customerId)
    {
        var review = await _context.Reviews.FindAsync(reviewId);
        if (review == null || review.IsDeleted)
            throw new ArgumentException("Review not found.");

        if (review.CustomerId != customerId)
            throw new UnauthorizedAccessException("You can only delete your own review.");

        review.IsDeleted = true;
        review.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await UpdateHotelStarRatingAsync(review.HotelId);

        await _auditLogService.LogActionAsync(
            "Review", review.Id, "Delete",
            $"Customer {customerId} deleted review {review.Id}.",
            customerId);
    }

    public async Task AdminDeleteReviewAsync(int reviewId, string reason, int adminUserId)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Removal reason is required.");

        var review = await _context.Reviews.FindAsync(reviewId);
        if (review == null || review.IsDeleted)
            throw new ArgumentException("Review not found.");

        review.IsDeleted = true;
        review.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await UpdateHotelStarRatingAsync(review.HotelId);

        await _auditLogService.LogActionAsync(
            "Review", review.Id, "AdminDelete",
            $"Admin {adminUserId} removed review {review.Id}. Reason: {reason}",
            adminUserId);
    }
}
