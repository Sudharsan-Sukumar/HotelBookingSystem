using System;
using System.Threading.Tasks;
using HotelBooking.API.Common.Models;
using HotelBooking.API.Features.Rooms.DTOs;
using HotelBooking.API.Features.Rooms.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Features.Rooms.Controllers;

[ApiController]
[Route("api/blockeddates")]
[Authorize(Roles = "Manager,Admin")]
[ApiExplorerSettings(GroupName = "Manager")]
public class BlockedDatesController : ControllerBase
{
    private readonly IBlockedDateService _blockedDateService;

    public BlockedDatesController(IBlockedDateService blockedDateService)
    {
        _blockedDateService = blockedDateService;
    }

    [HttpPost]
    public async Task<IActionResult> AddBlockedDate([FromBody] BlockedDateRequestDto request)
    {
        try
        {
            var blockedDate = await _blockedDateService.AddBlockedDateAsync(request);
            return Ok(ApiResponse<BlockedDateResponseDto>.SuccessResponse(blockedDate, "Blocked date added successfully."));
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpGet("{roomTypeId}")]
    public async Task<IActionResult> GetBlockedDates(int roomTypeId)
    {
        var blockedDates = await _blockedDateService.GetBlockedDatesAsync(roomTypeId);
        return Ok(ApiResponse<IEnumerable<BlockedDateResponseDto>>.SuccessResponse(blockedDates));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBlockedDate(int id)
    {
        await _blockedDateService.DeleteBlockedDateAsync(id);
        return Ok(ApiResponse.SuccessResponse("Blocked date deleted successfully."));
    }
}
