using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Features.CMS.Services;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Common.Models;

namespace HotelBooking.API.Features.CMS.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
[ApiExplorerSettings(GroupName = "Admin")]
public class SystemSettingsController : ControllerBase
{
    private readonly ISystemSettingService _settingService;

    public SystemSettingsController(ISystemSettingService settingService)
    {
        _settingService = settingService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var settings = await _settingService.GetAllSettingsAsync();
        return Ok(ApiResponse<IEnumerable<SystemSettingDto>>.SuccessResponse(settings));
    }

    [HttpGet("{key}")]
    public async Task<IActionResult> GetByKey(string key)
    {
        var setting = await _settingService.GetSettingByKeyAsync(key);
        if (setting == null) return NotFound(ApiResponse<object?>.ErrorResponse("Setting not found."));
        return Ok(ApiResponse<SystemSettingDto>.SuccessResponse(setting));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SystemSettingDto dto)
    {
        var created = await _settingService.CreateSettingAsync(dto);
        if (!created) return Conflict(ApiResponse<object?>.ErrorResponse("Setting already exists."));
        return Ok(ApiResponse.SuccessResponse("Setting created successfully."));
    }

    [HttpPut("{key}")]
    public async Task<IActionResult> Update(string key, [FromBody] SystemSettingDto dto)
    {
        var updated = await _settingService.UpdateSettingAsync(key, dto);
        if (!updated) return NotFound(ApiResponse<object?>.ErrorResponse("Setting not found."));
        return Ok(ApiResponse.SuccessResponse("Setting updated successfully."));
    }
}
