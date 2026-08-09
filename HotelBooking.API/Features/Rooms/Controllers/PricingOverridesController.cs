using System;
using System.Threading.Tasks;
using HotelBooking.API.Features.Rooms.DTOs;
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
            return Ok(pricingOverride);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpGet("{roomTypeId}")]
    public async Task<IActionResult> GetOverrides(int roomTypeId)
    {
        var overrides = await _pricingService.GetPricingOverridesAsync(roomTypeId);
        return Ok(overrides);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteOverride(int id)
    {
        await _pricingService.DeletePricingOverrideAsync(id);
        return NoContent();
    }
}
