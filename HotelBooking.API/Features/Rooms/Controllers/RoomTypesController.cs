using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HotelBooking.API.Common.Models;
using HotelBooking.API.Features.Rooms.DTOs;
using HotelBooking.API.Features.Rooms.Services;

namespace HotelBooking.API.Features.Rooms.Controllers;

[ApiController]
[Route("api/hotels/{hotelId}/roomtypes")]
[ApiExplorerSettings(GroupName = "Manager")]
public class RoomTypesController : ControllerBase
{
    private readonly IRoomTypeService _roomTypeService;

    public RoomTypesController(IRoomTypeService roomTypeService)
    {
        _roomTypeService = roomTypeService;
    }

    private int GetUserId()
    {
        return int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "0");
    }

    [HttpPost]
    [Authorize(Roles = "Manager")]
    public async Task<IActionResult> Create(int hotelId, [FromBody] RoomTypeRequestDto request)
    {
        try
        {
            var result = await _roomTypeService.CreateRoomTypeAsync(hotelId, GetUserId(), request);
            return CreatedAtAction(nameof(GetByHotel), new { hotelId = hotelId },
                ApiResponse<RoomTypeResponseDto>.SuccessResponse(result, "Room type created successfully."));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetByHotel(int hotelId)
    {
        var result = await _roomTypeService.GetRoomTypesByHotelAsync(hotelId);
        return Ok(ApiResponse<IEnumerable<RoomTypeResponseDto>>.SuccessResponse(result));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Manager")]
    public async Task<IActionResult> Update(int hotelId, int id, [FromBody] RoomTypeRequestDto request)
    {
        try
        {
            var result = await _roomTypeService.UpdateRoomTypeAsync(id, GetUserId(), request);
            return Ok(ApiResponse<RoomTypeResponseDto>.SuccessResponse(result, "Room type updated successfully."));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (DbUpdateConcurrencyException ex)
        {
            return Conflict(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    public class MaintenanceModeDto
    {
        public bool IsUnderMaintenance { get; set; }
    }

    [HttpPatch("{id}/maintenance")]
    [Authorize(Roles = "Manager")]
    public async Task<IActionResult> SetMaintenanceMode(int hotelId, int id, [FromBody] MaintenanceModeDto dto)
    {
        try
        {
            var result = await _roomTypeService.SetMaintenanceModeAsync(id, GetUserId(), dto.IsUnderMaintenance);
            return Ok(ApiResponse<RoomTypeResponseDto>.SuccessResponse(result, "Maintenance mode updated successfully."));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (DbUpdateConcurrencyException ex)
        {
            return Conflict(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Manager")]
    public async Task<IActionResult> Delete(int hotelId, int id)
    {
        try
        {
            var result = await _roomTypeService.DeleteRoomTypeAsync(id, GetUserId());
            if (!result) return NotFound(ApiResponse<object?>.ErrorResponse("Room type not found."));
            return Ok(ApiResponse.SuccessResponse("Room type deleted successfully."));
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (DbUpdateException)
        {
            // Admin Edge Case #6: a hard-delete attempt hit the RoomType->Booking Restrict FK because
            // this room type still has (past/completed) booking rows referencing it, even though the
            // service's own future-bookings pre-check passed — surface as a clean conflict, not a 500.
            return Conflict(ApiResponse<object?>.ErrorResponse(
                "This room type cannot be deleted because bookings still reference it. Deactivate it instead."));
        }
    }
}
