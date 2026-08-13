using System;
using System.Threading.Tasks;
using HotelBooking.API.Common.Models;
using HotelBooking.API.Features.Rooms.DTOs;
using HotelBooking.API.Features.Rooms.Models;
using HotelBooking.API.Features.Rooms.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Features.Rooms.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Manager,Admin")]
[ApiExplorerSettings(GroupName = "Manager")]
public class PricingOverridesController : ControllerBase
{
    private readonly IPricingService _pricingService;

    public PricingOverridesController(IPricingService pricingService)
    {
        _pricingService = pricingService;
    }

    [HttpPost]
    public async Task<IActionResult> AddOverride([FromBody] PricingOverrideRequestDto request)
    {
        try
        {
            var pricingOverride = await _pricingService.AddPricingOverrideAsync(request);
            return Ok(ApiResponse<PricingOverride>.SuccessResponse(pricingOverride, "Pricing override added successfully."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpGet("{roomTypeId}")]
    public async Task<IActionResult> GetOverrides(int roomTypeId)
    {
        var overrides = await _pricingService.GetPricingOverridesAsync(roomTypeId);
        return Ok(ApiResponse<IEnumerable<PricingOverride>>.SuccessResponse(overrides));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteOverride(int id)
    {
        await _pricingService.DeletePricingOverrideAsync(id);
        return Ok(ApiResponse.SuccessResponse("Pricing override deleted successfully."));
    }
}
