using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HotelBooking.API.Common.Models;
using HotelBooking.API.Features.Reports.Services;
using HotelBooking.API.Features.Reports.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Features.Reports.Controllers;

// Customer-only reports: a customer's own booking history and payment/refund transactions.
// Route/response shapes are unchanged from the previous combined ReportsController — this split
// only regroups by actor for Swagger and authorization clarity.
[ApiController]
[Route("api/reports/customer")]
[Authorize(Roles = "Customer")]
[ApiExplorerSettings(GroupName = "Customer")]
public class CustomerReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public CustomerReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    private int GetUserId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "0");
    }

    [HttpGet("bookings")]
    public async Task<IActionResult> GetCustomerBookingsSummary()
    {
        var userId = GetUserId();
        var report = await _reportService.GetCustomerBookingsSummaryAsync(userId);
        return Ok(ApiResponse<IEnumerable<CustomerBookingSummaryDto>>.SuccessResponse(report));
    }

    [HttpGet("transactions")]
    public async Task<IActionResult> GetCustomerTransactions([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var userId = GetUserId();
        var report = await _reportService.GetCustomerTransactionsAsync(userId, startDate, endDate);
        return Ok(ApiResponse<IEnumerable<CustomerTransactionReportDto>>.SuccessResponse(report));
    }
}
