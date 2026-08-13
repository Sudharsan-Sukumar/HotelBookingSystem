using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HotelBooking.API.Features.Hotels.DTOs;
using HotelBooking.API.Features.Hotels.Services;
using HotelBooking.API.Features.Hotels.Models;
using HotelBooking.API.Common.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Features.Hotels.Controllers;

[ApiController]
[Route("api/[controller]")]
[ApiExplorerSettings(GroupName = "Manager")]
public class GalleriesController : ControllerBase
{
    private readonly IGalleryService _galleryService;

    public GalleriesController(IGalleryService galleryService)
    {
        _galleryService = galleryService;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "0");

    [HttpPost("hotel")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> UploadHotelImage([FromForm] ImageUploadDto request)
    {
        try
        {
            var image = await _galleryService.UploadHotelImageAsync(request, GetUserId(), User.IsInRole("Admin"));
            return Ok(ApiResponse<HotelImageResponseDto>.SuccessResponse(
                HotelImageResponseDto.FromModel(image), "Hotel image uploaded successfully."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpGet("hotel/{hotelId}")]
    public async Task<IActionResult> GetHotelImages(int hotelId)
    {
        var images = await _galleryService.GetHotelImagesAsync(hotelId);
        return Ok(ApiResponse<IEnumerable<HotelImageResponseDto>>.SuccessResponse(
            images.Select(HotelImageResponseDto.FromModel)));
    }

    [HttpGet("hotel/{imageId}/content")]
    [Produces("image/jpeg", "application/json")]
    public async Task<IActionResult> GetHotelImageContent(int imageId)
    {
        var photo = await _galleryService.GetHotelImageContentAsync(imageId);
        if (photo == null) return NotFound(ApiResponse<object?>.ErrorResponse("Image not found."));

        return File(photo.Value.Data, photo.Value.ContentType);
    }

    [HttpDelete("hotel/{imageId}")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> DeleteHotelImage(int imageId)
    {
        try
        {
            await _galleryService.DeleteHotelImageAsync(imageId, GetUserId(), User.IsInRole("Admin"));
            return Ok(ApiResponse.SuccessResponse("Hotel image deleted successfully."));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpPost("roomtype")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> UploadRoomTypeImage([FromForm] ImageUploadDto request)
    {
        try
        {
            var image = await _galleryService.UploadRoomTypeImageAsync(request);
            return Ok(ApiResponse<RoomTypeImage>.SuccessResponse(image, "Room type image uploaded successfully."));
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

    [HttpGet("roomtype/{roomTypeId}")]
    public async Task<IActionResult> GetRoomTypeImages(int roomTypeId)
    {
        var images = await _galleryService.GetRoomTypeImagesAsync(roomTypeId);
        return Ok(ApiResponse<IEnumerable<RoomTypeImage>>.SuccessResponse(images));
    }

    [HttpDelete("roomtype/{imageId}")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> DeleteRoomTypeImage(int imageId)
    {
        try
        {
            await _galleryService.DeleteRoomTypeImageAsync(imageId);
            return Ok(ApiResponse.SuccessResponse("Room type image deleted successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }
}
