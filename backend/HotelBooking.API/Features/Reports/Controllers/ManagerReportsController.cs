using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HotelBooking.API.Common.Models;
using HotelBooking.API.Features.Reports.Services;
using HotelBooking.API.Features.Reports.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Features.Reports.Controllers;

// Hotel Manager reports: scoped strictly to a hotel the caller actually manages. Admin previously
// shared this same route via a dual "Manager,Admin" role check with an IsInRole("Admin") bypass —
// that's been removed; Admin's equivalent (and Admin-wide) capability now lives at
// AdminReportsController.GetHotelReservationsReport, so Admin no longer needs to reach into the
// Manager-scoped controller at all.
[ApiController]
[Route("api/reports/manager")]
[Authorize(Roles = "Manager")]
[ApiExplorerSettings(GroupName = "Manager")]
public class ManagerReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ManagerReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    private int GetUserId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "0");
    }

    [HttpGet("reservations/{hotelId}")]
    public async Task<IActionResult> GetHotelReservationsReport(int hotelId, [FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate,
        [FromQuery] int? roomTypeId, [FromQuery] int page = 1, [FromQuery] int pageSize = 100)
    {
        var isOwnHotel = await _reportService.IsManagerOfHotelAsync(GetUserId(), hotelId);
        if (!isOwnHotel)
        {
            return Forbid();
        }

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
