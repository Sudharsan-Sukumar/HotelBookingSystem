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

    [HttpGet]
    public async Task<IActionResult> GetAllTransactions([FromQuery] int? bookingId, [FromQuery] string? status)
    {
        var transactions = await _razorpayPaymentService.GetAllTransactionsAsync(bookingId, status);
        return Ok(ApiResponse<IEnumerable<AdminTransactionDto>>.SuccessResponse(transactions));
    }
}
