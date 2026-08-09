using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HotelBooking.API.Features.Reports.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Features.Reports.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[ApiExplorerSettings(GroupName = "Manager")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    private int GetUserId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "0");
    }

    [HttpGet("customer/bookings")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> GetCustomerBookingsSummary()
    {
        var userId = GetUserId();
        var report = await _reportService.GetCustomerBookingsSummaryAsync(userId);
        return Ok(report);
    }

    [HttpGet("customer/transactions")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> GetCustomerTransactions([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var userId = GetUserId();
        var report = await _reportService.GetCustomerTransactionsAsync(userId, startDate, endDate);
        return Ok(report);
    }

    [HttpGet("manager/reservations/{hotelId}")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> GetHotelReservationsReport(int hotelId, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] int? roomTypeId)
    {
        if (!User.IsInRole("Admin"))
        {
            var isOwnHotel = await _reportService.IsManagerOfHotelAsync(GetUserId(), hotelId);
            if (!isOwnHotel)
            {
                return Forbid();
            }
        }

        try
        {
            var report = await _reportService.GetHotelReservationsReportAsync(hotelId, startDate, endDate, roomTypeId);
            return Ok(report);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("admin/system-bookings")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetSystemWideBookingsReport([FromQuery] int? hotelId, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var report = await _reportService.GetSystemWideBookingsReportAsync(hotelId, startDate, endDate);
        return Ok(report);
    }

    [HttpGet("admin/customer-activity/{customerId}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetCustomerActivityReport(int customerId)
    {
        try
        {
            var report = await _reportService.GetCustomerActivityReportAsync(customerId);
            return Ok(report);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
