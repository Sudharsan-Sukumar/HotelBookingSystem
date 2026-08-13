using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Users.Services;
using HotelBooking.API.Common.Models;

namespace HotelBooking.API.Users.Controllers;

[ApiController]
[Route("api/admin/bans")]
[Authorize(Roles = "Admin")]
[ApiExplorerSettings(GroupName = "Admin")]
public class AdminBanController : ControllerBase
{
    private readonly IUserBanService _banService;

    public AdminBanController(IUserBanService banService)
    {
        _banService = banService;
    }

    public class BanRequestDto
    {
        [Required(ErrorMessage = "Reason is required.")]
        [MinLength(1, ErrorMessage = "Reason cannot be empty.")]
        public string Reason { get; set; } = string.Empty;
    }

    [HttpPost("users/{id}/ban")]
    public async Task<IActionResult> BanUser(int id, [FromBody] BanRequestDto dto)
    {
        var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var success = await _banService.BanUserAsync(id, dto.Reason, adminId);
        if (!success) return BadRequest(ApiResponse<object?>.ErrorResponse("User not found or already suspended."));
        return Ok(ApiResponse.SuccessResponse("User suspended successfully."));
    }

    [HttpPost("users/{id}/unban")]
    public async Task<IActionResult> UnbanUser(int id, [FromBody] BanRequestDto dto)
    {
        var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var success = await _banService.UnbanUserAsync(id, dto.Reason, adminId);
        if (!success) return BadRequest(ApiResponse<object?>.ErrorResponse("User not found or not suspended."));
        return Ok(ApiResponse.SuccessResponse("User unsuspended successfully."));
    }
}
