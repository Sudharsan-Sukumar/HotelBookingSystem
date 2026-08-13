using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Features.Reviews.DTOs;
using HotelBooking.API.Features.Reviews.Models;

namespace HotelBooking.API.Features.Reviews.Services;

public interface IReviewService
{
    Task<Review> SubmitReviewAsync(int customerId, ReviewCreateDto request);
    Task<IEnumerable<Review>> GetHotelReviewsAsync(int hotelId);
    Task<Review> RespondToReviewAsync(int reviewId, ManagerResponseDto request);
    Task<Review> EditOwnReviewAsync(int reviewId, int customerId, ReviewCreateDto request);
    Task DeleteOwnReviewAsync(int reviewId, int customerId);
    Task AdminDeleteReviewAsync(int reviewId, string reason, int adminUserId);
}
