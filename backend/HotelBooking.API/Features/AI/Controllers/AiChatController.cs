using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HotelBooking.API.Common.Models;
using HotelBooking.API.Features.AI.DTOs;
using HotelBooking.API.Features.AI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace HotelBooking.API.Features.AI.Controllers;

// Deliberately NOT [Authorize] — the assistant must work for anonymous landing-page visitors too
// (general hotel/branch/room questions), and only needs identity for "my booking"/"my payment"
// questions. [AllowAnonymous] is explicit here since some other part of the pipeline could set a
// fallback authorization policy later; this documents the intent even if redundant today.
[ApiController]
[Route("api/ai")]
[AllowAnonymous]
[ApiExplorerSettings(GroupName = "Customer")]
[Tags("AI Assistant")]
public class AiChatController : ControllerBase
{
    private readonly IAiChatService _aiChatService;
    private readonly ILogger<AiChatController> _logger;

    public AiChatController(IAiChatService aiChatService, ILogger<AiChatController> logger)
    {
        _aiChatService = aiChatService;
        _logger = logger;
    }

    // Resolves to the same numeric user id every other authenticated controller uses (e.g.
    // BookingsController.GetUserId) when a valid token is present; null otherwise. Booking/payment
    // tools then only ever query THIS user's own data via IBookingService's existing (userId)
    // scoping — never another customer's.
    private int? GetUserId()
    {
        if (User.Identity?.IsAuthenticated != true) return null;
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return int.TryParse(claim, out var id) ? id : null;
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] ChatRequestDto request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object?>.ErrorResponse("Validation failed."));

        try
        {
            var reply = await _aiChatService.GetReplyAsync(request, GetUserId());
            return Ok(ApiResponse<ChatResponseDto>.SuccessResponse(reply));
        }
        catch (OpenRouterConfigurationException)
        {
            // Never surface "bad API key" details to a customer — that's an operator problem.
            return StatusCode(503, ApiResponse<object?>.ErrorResponse("The AI assistant is temporarily unavailable. Please try again later."));
        }
        catch (OpenRouterRateLimitedException ex)
        {
            return StatusCode(429, ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (OpenRouterUnavailableException ex)
        {
            return StatusCode(503, ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (Exception ex)
        {
            // Catch-all so nothing unexpected (a malformed OpenRouter error body, an unmapped HTTP
            // status, a tool-execution edge case) ever reaches the customer as a raw technical
            // message — that would violate the "never expose internal details" safety rule. The
            // real detail still goes to the server log for an operator to diagnose.
            _logger.LogError(ex, "AI chat request failed unexpectedly.");
            return StatusCode(503, ApiResponse<object?>.ErrorResponse("The AI assistant is temporarily unavailable. Please try again shortly."));
        }
    }
}
