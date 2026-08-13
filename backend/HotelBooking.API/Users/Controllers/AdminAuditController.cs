using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Users.Services;
using HotelBooking.API.Users.Models;
using HotelBooking.API.Common.Models;

namespace HotelBooking.API.Users.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
[ApiExplorerSettings(GroupName = "Admin")]
public class AdminAuditController : ControllerBase
{
    private readonly IAuditLogService _auditService;

    public AdminAuditController(IAuditLogService auditService)
    {
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var logs = await _auditService.GetAuditLogsAsync();
        return Ok(ApiResponse<IEnumerable<AuditLog>>.SuccessResponse(logs));
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetByUser(int userId)
    {
        var logs = await _auditService.GetAuditLogsByUserAsync(userId);
        return Ok(ApiResponse<IEnumerable<AuditLog>>.SuccessResponse(logs));
    }
}
