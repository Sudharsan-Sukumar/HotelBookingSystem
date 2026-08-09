using System;
using System.Threading.Tasks;
using HotelBooking.API.Features.Hotels.DTOs;
using HotelBooking.API.Features.Hotels.Services;
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

    [HttpPost("hotel")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> UploadHotelImage([FromForm] ImageUploadDto request)
    {
        try
        {
            var image = await _galleryService.UploadHotelImageAsync(request);
            return Ok(image);
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

    [HttpGet("hotel/{hotelId}")]
    public async Task<IActionResult> GetHotelImages(int hotelId)
    {
        var images = await _galleryService.GetHotelImagesAsync(hotelId);
        return Ok(images);
    }

    [HttpDelete("hotel/{imageId}")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> DeleteHotelImage(int imageId)
    {
        try
        {
            await _galleryService.DeleteHotelImageAsync(imageId);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("roomtype")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> UploadRoomTypeImage([FromForm] ImageUploadDto request)
    {
        try
        {
            var image = await _galleryService.UploadRoomTypeImageAsync(request);
            return Ok(image);
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

    [HttpGet("roomtype/{roomTypeId}")]
    public async Task<IActionResult> GetRoomTypeImages(int roomTypeId)
    {
        var images = await _galleryService.GetRoomTypeImagesAsync(roomTypeId);
        return Ok(images);
    }

    [HttpDelete("roomtype/{imageId}")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> DeleteRoomTypeImage(int imageId)
    {
        await _galleryService.DeleteRoomTypeImageAsync(imageId);
        return NoContent();
    }
}
