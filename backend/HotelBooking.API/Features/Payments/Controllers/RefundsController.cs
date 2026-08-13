using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HotelBooking.API.Features.Payments.DTOs;
using HotelBooking.API.Features.Payments.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Common.Models;
using HotelBooking.API.Common.Services;

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
            return Forbid(ex.Message);
        }
    }

    [HttpPost("admin/override")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AdminOverrideRefund([FromBody] AdminRefundOverrideDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object?>.ErrorResponse("Validation failed."));

        try
        {
            var refund = await _refundService.AdminOverrideRefundAsync(dto, GetUserId());
            return Ok(ApiResponse<RefundResponseDto>.SuccessResponse(refund, "Refund override applied successfully."));
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (Exception ex) when (TransientDbFailure.IsTransient(ex))
        {
            // Same defense-in-depth as BookingsController.CreateBooking/ModifyBooking — must precede
            // the InvalidOperationException catch below since that's the actual wrapper type EF uses.
            return Conflict(ApiResponse<object?>.ErrorResponse("This refund could not be processed due to a conflicting operation. Please try again."));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }
}
