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

// Permanent hotel policies (Privacy, Terms & Conditions, Modification, Cancellation & Refund) —
// a separate controller/route from ContentController and SeasonalPoliciesController so neither of
// those existing endpoint sets is touched. GET is public (the customer-facing footer modals read
// from here); PUT is Admin-only, mirroring ContentController's Hero/About/Contact pattern.
[ApiController]
[Route("api/content/general-policies")]
[ApiExplorerSettings(GroupName = "Admin")]
[Tags("CMS")]
public class GeneralPoliciesController : ControllerBase
{
    private readonly IGeneralPolicyService _policyService;

    public GeneralPoliciesController(IGeneralPolicyService policyService)
    {
        _policyService = policyService;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "0");

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var policies = await _policyService.GetAllAsync();
        return Ok(ApiResponse<IEnumerable<GeneralPolicyResponseDto>>.SuccessResponse(policies));
    }

    [HttpGet("{policyType}")]
    public async Task<IActionResult> GetByType(string policyType)
    {
        try
        {
            var policy = await _policyService.GetByTypeAsync(policyType);
            return Ok(ApiResponse<GeneralPolicyResponseDto>.SuccessResponse(policy));
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpPut("{policyType}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(string policyType, [FromBody] GeneralPolicyRequestDto request)
    {
        if (!ModelState.IsValid) return BadRequest(ApiResponse<object?>.ErrorResponse("Validation failed."));

        try
        {
            var updated = await _policyService.UpdateAsync(policyType, request, GetUserId());
            return Ok(ApiResponse<GeneralPolicyResponseDto>.SuccessResponse(updated, "Policy updated successfully."));
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }
}
