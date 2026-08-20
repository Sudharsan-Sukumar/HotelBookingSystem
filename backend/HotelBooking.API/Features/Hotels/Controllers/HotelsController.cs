using System.Security.Claims;
using HotelBooking.API.Features.Hotels.DTOs;
using HotelBooking.API.Features.Hotels.Services;
using HotelBooking.API.Common.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace HotelBooking.API.Features.Hotels.Controllers;

[ApiController]
[Route("api/[controller]")]
[ApiExplorerSettings(GroupName = "Manager")]
public class HotelsController : ControllerBase
{
    private readonly IHotelService _hotelService;

    public HotelsController(IHotelService hotelService)
    {
        _hotelService = hotelService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var hotels = await _hotelService.GetAllHotelsAsync();
        return Ok(ApiResponse<IEnumerable<HotelResponseDto>>.SuccessResponse(hotels));
    }

    [HttpGet("my")]
    [Authorize(Roles = "Manager")]
    public async Task<IActionResult> GetMyHotels()
    {
        var managerId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "0");
        var hotels = await _hotelService.GetHotelsByManagerAsync(managerId);
        return Ok(ApiResponse<IEnumerable<HotelResponseDto>>.SuccessResponse(hotels));
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] SearchRequestDto request)
    {
        try
        {
            var results = await _hotelService.SearchHotelsAsync(request);
            if (!results.Any())
                return NotFound(ApiResponse<IEnumerable<SearchHotelResultDto>>.ErrorResponse("No hotels found for the selected destination and dates."));

            return Ok(ApiResponse<IEnumerable<SearchHotelResultDto>>.SuccessResponse(results));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var hotel = await _hotelService.GetHotelByIdAsync(id);
        if (hotel == null) return NotFound(ApiResponse<object?>.ErrorResponse("Hotel not found."));
        return Ok(ApiResponse<HotelResponseDto>.SuccessResponse(hotel));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] HotelRequestDto request)
    {
        try
        {
            var createdHotel = await _hotelService.CreateHotelAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = createdHotel.Id },
                ApiResponse<HotelResponseDto>.SuccessResponse(createdHotel, "Hotel created successfully."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] HotelRequestDto request)
    {
        try
        {
            var updatedHotel = await _hotelService.UpdateHotelAsync(id, request);
            if (updatedHotel == null) return NotFound(ApiResponse<object?>.ErrorResponse("Hotel not found."));
            return Ok(ApiResponse<HotelResponseDto>.SuccessResponse(updatedHotel, "Hotel updated successfully."));
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

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _hotelService.DeleteHotelAsync(id);
        if (!result) return NotFound(ApiResponse<object?>.ErrorResponse("Hotel not found."));
        return Ok(ApiResponse.SuccessResponse("Hotel deleted successfully."));
    }

    [HttpPost("{id}/managers")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> AssignManager(int id, [FromBody] int managerId)
    {
        try
        {
            var success = await _hotelService.AssignManagerAsync(id, managerId);
            if (!success) return NotFound(ApiResponse<object?>.ErrorResponse("Hotel not found."));
            return Ok(ApiResponse.SuccessResponse("Manager assigned successfully."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }
}
