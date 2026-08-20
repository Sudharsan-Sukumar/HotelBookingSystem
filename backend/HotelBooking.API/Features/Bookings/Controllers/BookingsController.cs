using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HotelBooking.API.Features.Bookings.DTOs;
using HotelBooking.API.Features.Bookings.Services;
using HotelBooking.API.Common.Attributes;
using HotelBooking.API.Common.Models;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Common.Services;

namespace HotelBooking.API.Features.Bookings.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Customer")]
[ApiExplorerSettings(GroupName = "Customer")]
public class BookingsController : ControllerBase
{
    private readonly IBookingService _bookingService;

    public BookingsController(IBookingService bookingService)
    {
        _bookingService = bookingService;
    }

    private int GetUserId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "0");
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreateBooking([FromBody] BookingRequestDto request)
    {
        try
        {
            var booking = await _bookingService.CreateBookingAsync(GetUserId(), request);
            return CreatedAtAction(nameof(GetBookingById), new { id = booking.Id },
                ApiResponse<BookingResponseDto>.SuccessResponse(booking, "Booking created successfully."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        // Concurrency Exception Passthrough - mirrors ModifyBooking's existing 409 mapping for a genuine RowVersion/Serializable conflict, instead of falling through to the generic InvalidOperationException-to-Conflict catch below.
        catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException)
        {
            return Conflict(ApiResponse<object?>.ErrorResponse("The selected room or booking state has changed. Please refresh and try again."));
        }
        catch (Exception ex) when (TransientDbFailure.IsTransient(ex))
        {
            // QA Defect (High), defense-in-depth: BookingService.CreateBookingAsync already retries/
            // catches the transient-deadlock scenarios it can anticipate (its own transaction, and
            // AuditLogService's write immediately after), but under real contention a deadlock can
            // still occasionally land on some OTHER write in the same request (e.g. the manager
            // notification queued right after). This must run BEFORE the InvalidOperationException
            // catch below: EF Core wraps a transient SqlException as InvalidOperationException, not
            // DbUpdateException/SqlException directly, so an ordinary type-matched catch further down
            // would otherwise swallow it and leak the raw driver message via ex.Message.
            return Conflict(ApiResponse<object?>.ErrorResponse("Sorry, the selected rooms are no longer available. Please search again."));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetBookingById(int id)
    {
        var booking = await _bookingService.GetBookingByIdAsync(id, GetUserId());
        if (booking == null) return NotFound(ApiResponse<object?>.ErrorResponse("Booking not found."));
        return Ok(ApiResponse<BookingResponseDto>.SuccessResponse(booking));
    }

    [HttpGet]
    public async Task<IActionResult> GetMyBookings(
        [FromQuery, Range(1, int.MaxValue, ErrorMessage = "Page must be greater than 0")] int page = 1,
        [FromQuery, Range(1, 100, ErrorMessage = "PageSize must be between 1 and 100")] int pageSize = 10)
    {
        if (!ModelState.IsValid) return BadRequest(ApiResponse<object?>.ErrorResponse("Invalid pagination parameters."));

        var bookings = await _bookingService.GetUserBookingsAsync(GetUserId());
        var paginatedBookings = bookings.Skip((page - 1) * pageSize).Take(pageSize);
        return Ok(ApiResponse<IEnumerable<BookingResponseDto>>.SuccessResponse(paginatedBookings));
    }

    [HttpPut("{id}/modify")]
    public async Task<IActionResult> ModifyBooking([Range(1, int.MaxValue, ErrorMessage = "Invalid booking ID")] int id, [FromBody] ModifyBookingDto request)
    {
        if (!ModelState.IsValid) return BadRequest(ApiResponse<object?>.ErrorResponse("Invalid booking ID."));
        try
        {
            var booking = await _bookingService.ModifyBookingAsync(id, GetUserId(), request);
            return Ok(ApiResponse<BookingResponseDto>.SuccessResponse(booking, "Booking modified successfully."));
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException)
        {
            // Must precede the InvalidOperationException catch below: this is a genuine multi-tab
            // conflict (the client's RowVersion is stale), and the Angular modify-step3 component's
            // reload-prompt UX only triggers on a 409 — a plain InvalidOperationException/400 here
            // would silently fall back to the generic error message with no reload button.
            return Conflict(ApiResponse<object?>.ErrorResponse("This booking was changed elsewhere since you loaded it. Please reload and try again."));
        }
        catch (Exception ex) when (TransientDbFailure.IsTransient(ex))
        {
            // Same defense-in-depth as CreateBooking above — must precede the InvalidOperationException
            // catch below since that's the actual wrapper type EF uses for this failure.
            return Conflict(ApiResponse<object?>.ErrorResponse("Rooms are not available for the new dates. Please try again."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpGet("{id}/invoice")]
    public async Task<IActionResult> DownloadInvoice(int id)
    {
        try
        {
            var csvBytes = await _bookingService.GenerateInvoiceCsvAsync(id, GetUserId());
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

    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelBooking(int id)
    {
        try
        {
            var booking = await _bookingService.CancelBookingAsync(id, GetUserId());
            return Ok(ApiResponse<BookingResponseDto>.SuccessResponse(booking, "Booking cancelled successfully."));
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException)
        {
            return Conflict(ApiResponse<object?>.ErrorResponse("The booking state was modified by another transaction. Please try again."));
        }
        catch (Exception ex) when (TransientDbFailure.IsTransient(ex))
        {
            return Conflict(ApiResponse<object?>.ErrorResponse("The booking state was modified by another transaction. Please try again."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }
}
