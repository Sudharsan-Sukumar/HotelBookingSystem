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
    private readonly ISecurityAuditLogService _securityAuditService;

    public AdminAuditController(IAuditLogService auditService, ISecurityAuditLogService securityAuditService)
    {
        _auditService = auditService;
        _securityAuditService = securityAuditService;
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

    // Technical/security audit trail (login, logout, lockout, token refresh) — distinct from the
    // business audit trail above (bookings, payments, admin actions).
    [HttpGet("security")]
    public async Task<IActionResult> GetSecurityLogs()
    {
        var logs = await _securityAuditService.GetRecentAsync();
        return Ok(ApiResponse<IEnumerable<SecurityAuditLog>>.SuccessResponse(logs));
    }
}
