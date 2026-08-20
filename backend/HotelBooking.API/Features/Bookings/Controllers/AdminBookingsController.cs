using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using HotelBooking.API.Common.Models;
using HotelBooking.API.Features.Bookings.DTOs;
using HotelBooking.API.Features.Bookings.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Features.Bookings.Controllers;

[ApiController]
[Route("api/admin/bookings")]
[Authorize(Roles = "Admin")]
[ApiExplorerSettings(GroupName = "Admin")]
public class AdminBookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public AdminBookingsController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelBooking(int id, [FromBody] AdminCancelBookingDto dto)
    {
        if (!ModelState.IsValid)
        {
            var errors = ModelState
                .Where(kvp => kvp.Value != null && kvp.Value.Errors.Count > 0)
                .SelectMany(kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage))
                .ToList();
            return BadRequest(ApiResponse<object?>.ErrorResponse("Validation failed.", errors));
        }

        var adminUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "0");

        try
        {
            var booking = await _bookingService.AdminCancelBookingAsync(id, dto.Reason, adminUserId);
            return Ok(ApiResponse<BookingResponseDto>.SuccessResponse(booking, "Booking cancelled successfully."));
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    // Admin invoice download (Booking History) — same CSV a customer downloads from My Bookings
    // (GET /api/bookings/{id}/invoice), resolved by booking id alone since an admin can view any
    // booking's invoice. Reuses BookingService's shared invoice-building logic; no new format.
    [HttpGet("{id}/invoice")]
    public async Task<IActionResult> DownloadInvoice(int id)
    {
        try
        {
            var csvBytes = await _bookingService.GenerateInvoiceCsvForAdminAsync(id);
            return File(csvBytes, "text/csv", $"invoice-{id}.csv");
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }
}
