using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HotelBooking.API.Features.Bookings.DTOs;
using HotelBooking.API.Features.Bookings.Services;
using HotelBooking.API.Common.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Features.Bookings.Controllers;

[ApiController]
[Route("api/bookings")]
[Authorize(Roles = "Manager")]
[ApiExplorerSettings(GroupName = "Manager")]
public class ManagerBookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public ManagerBookingsController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    private int GetManagerId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "0");
    }

    [HttpPut("{id}/check-in")]
    public async Task<IActionResult> CheckIn(int id)
    {
        try
        {
            var booking = await _bookingService.CheckInBookingAsync(id, GetManagerId());
            return Ok(ApiResponse<BookingResponseDto>.SuccessResponse(booking, "Booking checked in successfully."));
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpPut("{id}/check-out")]
    public async Task<IActionResult> CheckOut(int id)
    {
        try
        {
            var booking = await _bookingService.CheckOutBookingAsync(id, GetManagerId());
            return Ok(ApiResponse<BookingResponseDto>.SuccessResponse(booking, "Booking checked out successfully."));
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }
}
