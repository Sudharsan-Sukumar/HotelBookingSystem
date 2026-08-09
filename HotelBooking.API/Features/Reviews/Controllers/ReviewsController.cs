using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HotelBooking.API.Features.Reviews.DTOs;
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
            return Ok(review);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpGet("hotel/{hotelId}")]
    public async Task<IActionResult> GetHotelReviews(int hotelId)
    {
        var reviews = await _reviewService.GetHotelReviewsAsync(hotelId);
        return Ok(reviews);
    }

    [HttpPost("{reviewId}/respond")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> RespondToReview(int reviewId, [FromBody] ManagerResponseDto request)
    {
        try
        {
            var review = await _reviewService.RespondToReviewAsync(reviewId, request);
            return Ok(review);
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpDelete("{reviewId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteReview(int reviewId)
    {
        await _reviewService.DeleteReviewAsync(reviewId);
        return NoContent();
    }
}
