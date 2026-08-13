using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HotelBooking.API.Common.Models;
using HotelBooking.API.Features.Reviews.DTOs;
using HotelBooking.API.Features.Reviews.Models;
using HotelBooking.API.Features.Reviews.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Features.Reviews.Controllers;

[ApiController]
[Route("api/[controller]")]
[ApiExplorerSettings(GroupName = "Customer")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewService _reviewService;

    public ReviewsController(IReviewService reviewService)
    {
        _reviewService = reviewService;
    }

    private int GetUserId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "0");
    }

    [HttpPost("submit")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> SubmitReview([FromBody] ReviewCreateDto request)
    {
        try
        {
            var customerId = GetUserId();
            var review = await _reviewService.SubmitReviewAsync(customerId, request);
            return Ok(ApiResponse<Review>.SuccessResponse(review));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpGet("hotel/{hotelId}")]
    public async Task<IActionResult> GetHotelReviews(int hotelId)
    {
        var reviews = await _reviewService.GetHotelReviewsAsync(hotelId);
        return Ok(ApiResponse<IEnumerable<Review>>.SuccessResponse(reviews));
    }

    [HttpPost("{reviewId}/respond")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> RespondToReview(int reviewId, [FromBody] ManagerResponseDto request)
    {
        try
        {
            var review = await _reviewService.RespondToReviewAsync(reviewId, request);
            return Ok(ApiResponse<Review>.SuccessResponse(review, "Review response submitted successfully."));
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpPut("{reviewId}")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> EditOwnReview(int reviewId, [FromBody] ReviewCreateDto request)
    {
        try
        {
            var review = await _reviewService.EditOwnReviewAsync(reviewId, GetUserId(), request);
            return Ok(ApiResponse<Review>.SuccessResponse(review, "Review updated successfully."));
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    [HttpDelete("{reviewId}")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> DeleteOwnReview(int reviewId)
    {
        try
        {
            await _reviewService.DeleteOwnReviewAsync(reviewId, GetUserId());
            return Ok(ApiResponse.SuccessResponse("Review deleted successfully."));
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    public class AdminDeleteReviewDto
    {
        [System.ComponentModel.DataAnnotations.Required]
        public string Reason { get; set; } = string.Empty;
    }

    [HttpDelete("admin/{reviewId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminDeleteReview(int reviewId, [FromBody] AdminDeleteReviewDto dto)
    {
        try
        {
            var adminUserId = GetUserId();
            await _reviewService.AdminDeleteReviewAsync(reviewId, dto.Reason, adminUserId);
            return Ok(ApiResponse.SuccessResponse("Review deleted successfully."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }
}
