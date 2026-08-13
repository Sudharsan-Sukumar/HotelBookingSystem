using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Features.CMS.Services;
using HotelBooking.API.Features.CMS.Models;
using HotelBooking.API.Common.Models;

namespace HotelBooking.API.Features.CMS.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
[ApiExplorerSettings(GroupName = "Admin")]
public class DatabaseBackupsController : ControllerBase
{
    private readonly IDatabaseBackupService _backupService;

    public DatabaseBackupsController(IDatabaseBackupService backupService)
    {
        _backupService = backupService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var backups = await _backupService.GetAllBackupsAsync();
        return Ok(ApiResponse<IEnumerable<DatabaseBackup>>.SuccessResponse(backups));
    }

    [HttpPost("trigger")]
    public async Task<IActionResult> TriggerBackup()
    {
        var adminEmail = User.FindFirstValue(ClaimTypes.Email) ?? "admin@hotel.com";
        var result = await _backupService.TriggerManualBackupAsync(adminEmail);
        return Ok(ApiResponse<DatabaseBackup>.SuccessResponse(result, "Backup triggered successfully."));
    }

    [HttpPost("{id}/restore")]
    public async Task<IActionResult> RestoreBackup(int id)
    {
        try
        {
            var result = await _backupService.RestoreBackupAsync(id);
            return Ok(ApiResponse.SuccessResponse("Backup restored successfully."));
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
