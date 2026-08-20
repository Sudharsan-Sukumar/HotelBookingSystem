using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using HotelBooking.API.Features.Payments.DTOs;
using HotelBooking.API.Features.Payments.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Common.Models;

namespace HotelBooking.API.Features.Payments.Controllers;

[ApiController]
[Route("api/refunds")]
[Authorize]
public class RefundsController : ControllerBase
{
    private readonly IRefundService _refundService;

    public RefundsController(IRefundService refundService)
    {
        _refundService = refundService;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "0");

    [HttpGet("booking/{bookingId}")]
    public async Task<IActionResult> GetRefundsForBooking(int bookingId)
    {
        try
        {
            var refunds = await _refundService.GetRefundsForBookingAsync(bookingId, GetUserId(), User.IsInRole("Admin"));
            return Ok(ApiResponse<IEnumerable<RefundResponseDto>>.SuccessResponse(refunds));
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            // BUG-001 fix: see ReviewsController for the full explanation — Forbid(ex.Message)
            // misuses the authentication-scheme overload instead of returning a 403 response body.
            return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    // No admin refund-override endpoint — refunds are only ever created by the customer-facing
    // cancellation/modification flow itself (BookingService.CancelBookingAsync etc.). Admin stays
    // view-only here (GetRefundsForBooking above); manually issuing a refund is not an admin action.
}
