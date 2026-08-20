using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Common.Models;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Services;

namespace HotelBooking.API.Features.CMS.Controllers;

// Admin-only seasonal policy CRUD, deliberately routed under api/admin/policies (not the bare
// api/[controller] convention used by SystemSettingsController) so it reads as part of the CMS
// "Policy Management" admin surface rather than a generic settings endpoint.
[ApiController]
[Route("api/admin/policies")]
[Authorize(Roles = "Admin")]
[ApiExplorerSettings(GroupName = "Admin")]
public class SeasonalPoliciesController : ControllerBase
{
    private readonly ISeasonalPolicyService _policyService;

    public SeasonalPoliciesController(ISeasonalPolicyService policyService)
    {
        _policyService = policyService;
    }

    private int GetCurrentUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "0");

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var policies = await _policyService.GetAllAsync();
        return Ok(ApiResponse<IEnumerable<SeasonalPolicyDto>>.SuccessResponse(policies));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SeasonalPolicyRequestDto request)
    {
        try
        {
            var created = await _policyService.CreateAsync(request, GetCurrentUserId());
            return Ok(ApiResponse<SeasonalPolicyDto>.SuccessResponse(created, "Seasonal policy created successfully."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] SeasonalPolicyRequestDto request)
    {
        try
        {
            var updated = await _policyService.UpdateAsync(id, request, GetCurrentUserId());
            return Ok(ApiResponse<SeasonalPolicyDto>.SuccessResponse(updated, "Seasonal policy updated successfully."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _policyService.DeleteAsync(id, GetCurrentUserId());
            return Ok(ApiResponse.SuccessResponse("Seasonal policy deleted successfully."));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }
}

// Separate controller (rather than an action on SeasonalPoliciesController) because that
// controller carries a class-level [Authorize(Roles = "Admin")] — combining that with a looser
// per-action [Authorize] would still AND together and stay Admin-only. Any authenticated role can
// read the currently effective policy: the customer-facing policy modal and the booking flow both
// need it before a booking exists to snapshot it onto.
[ApiController]
[Route("api/policies")]
[Authorize]
[ApiExplorerSettings(GroupName = "Bookings")]
public class PoliciesController : ControllerBase
{
    private readonly ISeasonalPolicyService _policyService;

    public PoliciesController(ISeasonalPolicyService policyService)
    {
        _policyService = policyService;
    }

    [HttpGet("effective")]
    public async Task<IActionResult> GetEffective([FromQuery] DateTime? forDate)
    {
        var effective = await _policyService.GetEffectivePolicyAsync(forDate ?? DateTime.UtcNow);
        return Ok(ApiResponse<EffectiveCancellationPolicyDto>.SuccessResponse(effective));
    }
}
