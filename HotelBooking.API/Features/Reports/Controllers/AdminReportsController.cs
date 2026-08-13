using System;
using System.Threading.Tasks;
using HotelBooking.API.Common.Models;
using HotelBooking.API.Features.Reports.Services;
using HotelBooking.API.Features.Reports.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Features.Reports.Controllers;

// Admin-only reports: system-wide/overall reporting, plus the ability to pull the same detailed
// per-hotel reservations report Managers get for their own hotel — but for ANY hotel, with no
// ownership restriction, since Admin's oversight isn't scoped to a single hotel.
[ApiController]
[Route("api/reports/admin")]
[Authorize(Roles = "Admin")]
[ApiExplorerSettings(GroupName = "Admin")]
public class AdminReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public AdminReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("system-bookings")]
    public async Task<IActionResult> GetSystemWideBookingsReport([FromQuery] int? hotelId, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var report = await _reportService.GetSystemWideBookingsReportAsync(hotelId, startDate, endDate);
        return Ok(ApiResponse<SystemWideBookingsReportDto>.SuccessResponse(report));
    }

    [HttpGet("customer-activity/{customerId}")]
    public async Task<IActionResult> GetCustomerActivityReport(int customerId)
    {
        try
        {
            var report = await _reportService.GetCustomerActivityReportAsync(customerId);
            return Ok(ApiResponse<CustomerActivityReportDto>.SuccessResponse(report));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    // Same detailed report Managers see for their own hotel (GetHotelReservationsReportAsync),
    // exposed here for Admin without the manager-ownership check, since this replaces the "Admin"
    // half of the old dual "Manager,Admin" authorization on the Manager-scoped route.
    [HttpGet("hotel-reservations/{hotelId}")]
    public async Task<IActionResult> GetHotelReservationsReport(int hotelId, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate,
        [FromQuery] int? roomTypeId, [FromQuery] int page = 1, [FromQuery] int pageSize = 100)
    {
        try
        {
            var report = await _reportService.GetHotelReservationsReportAsync(hotelId, startDate, endDate, roomTypeId, page, pageSize);
            return Ok(ApiResponse<HotelReservationsReportDto>.SuccessResponse(report));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }
}
