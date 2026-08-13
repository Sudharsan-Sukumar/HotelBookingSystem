using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HotelBooking.API.Features.Payments.DTOs;
using HotelBooking.API.Features.Payments.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Common.Attributes;
using HotelBooking.API.Common.Models;

namespace HotelBooking.API.Features.Payments.Controllers;

// Razorpay Payment Links are the sole payment mechanism in the system — the Orders/Checkout-widget
// flow (and its /verify signature-check endpoint, which only ever applied to Orders) has been
// removed, along with the old internal mock payment gateway.
[ApiController]
[Route("api/razorpay")]
[Authorize(Roles = "Customer")]
[ApiExplorerSettings(GroupName = "Customer")]
public class RazorpayController : ControllerBase
{
    private readonly IRazorpayPaymentService _razorpayPaymentService;

    public RazorpayController(IRazorpayPaymentService razorpayPaymentService)
    {
        _razorpayPaymentService = razorpayPaymentService;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "0");

    [HttpPost("payment-link")]
    [Idempotent]
    public async Task<IActionResult> CreatePaymentLink([FromBody] CreatePaymentLinkDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object?>.ErrorResponse("Validation failed."));

        try
        {
            var link = await _razorpayPaymentService.CreatePaymentLinkAsync(GetUserId(), dto);
            return Ok(ApiResponse<PaymentLinkResponseDto>.SuccessResponse(link));
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (RazorpayConfigurationException ex)
        {
            return StatusCode(500, ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (RazorpayUnavailableException ex)
        {
            return StatusCode(503, ApiResponse<object?>.ErrorResponse(ex.Message, new List<string> { "Please retry in a minute, or contact support to complete payment offline." }));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpGet("status/{reference}")]
    public async Task<IActionResult> GetStatus(string reference)
    {
        var status = await _razorpayPaymentService.GetStatusByReferenceAsync(reference);
        if (status == null) return NotFound(ApiResponse<object?>.ErrorResponse("Payment status not found."));
        return Ok(ApiResponse<RazorpayPaymentStatusDto>.SuccessResponse(status));
    }
}
