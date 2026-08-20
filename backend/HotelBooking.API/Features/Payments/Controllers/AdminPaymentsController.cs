using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HotelBooking.API.Common.Models;
using HotelBooking.API.Features.Payments.DTOs;
using HotelBooking.API.Features.Payments.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Features.Payments.Controllers;

[ApiController]
[Route("api/admin/payments")]
[Authorize(Roles = "Admin")]
[ApiExplorerSettings(GroupName = "Admin")]
public class AdminPaymentsController : ControllerBase
{
    private readonly IRazorpayPaymentService _razorpayPaymentService;

    public AdminPaymentsController(IRazorpayPaymentService razorpayPaymentService)
    {
        _razorpayPaymentService = razorpayPaymentService;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "0");

    // Admin is view-only over payments — no manual payment entry point here. If Razorpay is
    // unreachable, the fallback lives entirely in the customer-facing flow (payment-portal's
    // gatewayUnavailable/sessionExpired states); admins must never be able to key in a payment
    // themselves.
    [HttpGet]
    public async Task<IActionResult> GetAllTransactions([FromQuery] int? bookingId, [FromQuery] string? status)
    {
        var transactions = await _razorpayPaymentService.GetAllTransactionsAsync(bookingId, status);
        return Ok(ApiResponse<IEnumerable<AdminTransactionDto>>.SuccessResponse(transactions));
    }
}
