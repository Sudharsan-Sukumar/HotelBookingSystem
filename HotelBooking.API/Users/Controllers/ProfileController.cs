using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HotelBooking.API.Users.DTOs;
using HotelBooking.API.Users.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Common.Models;

namespace HotelBooking.API.Users.Controllers;

[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly IProfileService _profileService;

    public ProfileController(IProfileService profileService)
    {
        _profileService = profileService;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "0");

    [HttpGet]
    public async Task<IActionResult> GetOwnProfile([FromQuery] bool includeDetails = true)
    {
        var profile = await _profileService.GetOwnProfileAsync(GetUserId());
        if (profile == null) return NotFound(ApiResponse<object?>.ErrorResponse("Profile not found."));
        return Ok(ApiResponse<UserDto>.SuccessResponse(profile));
    }

    [HttpPut("edit")]
    public async Task<IActionResult> UpdateOwnProfile([FromBody] ProfileUpdateDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object?>.ErrorResponse("Validation failed."));

        try
        {
            var updated = await _profileService.UpdateOwnProfileAsync(GetUserId(), dto);
            return Ok(ApiResponse<UserDto>.SuccessResponse(updated, "Profile updated successfully."));
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpPost("photo")]
    public async Task<IActionResult> UploadProfilePhoto([FromForm] ProfilePhotoUploadDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object?>.ErrorResponse("Validation failed."));

        try
        {
            var url = await _profileService.UploadProfilePhotoAsync(GetUserId(), dto.File);
            return Ok(ApiResponse<string>.SuccessResponse(url, "Profile photo uploaded successfully."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpGet("photo")]
    [Produces("image/jpeg", "application/json")]
    public async Task<IActionResult> GetProfilePhoto()
    {
        var photo = await _profileService.GetOwnProfilePhotoAsync(GetUserId());
        if (photo == null) return NotFound(ApiResponse<object?>.ErrorResponse("No profile photo uploaded."));

        return File(photo.Value.Data, photo.Value.ContentType);
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object?>.ErrorResponse("Validation failed."));

        try
        {
            await _profileService.ChangeOwnPasswordAsync(GetUserId(), dto);
            return Ok(ApiResponse.SuccessResponse("Password changed successfully."));
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }
}
