using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Users.Services;
using HotelBooking.API.Users.DTOs;
using HotelBooking.API.Common.Models;

namespace HotelBooking.API.Users.Controllers;

[ApiController]
[Route("api/admin/approvals")]
[Authorize(Roles = "Admin")]
[ApiExplorerSettings(GroupName = "Admin")]
public class AdminApprovalController : ControllerBase
{
    private readonly IApprovalWorkflowService _approvalService;

    public AdminApprovalController(IApprovalWorkflowService approvalService)
    {
        _approvalService = approvalService;
    }

    [HttpGet("managers/pending")]
    public async Task<IActionResult> GetPendingManagers()
    {
        var managers = await _approvalService.GetPendingManagersAsync();
        return Ok(ApiResponse<IEnumerable<ManagerDto>>.SuccessResponse(managers));
    }

    [HttpPut("managers/{id}/approve")]
    public async Task<IActionResult> ApproveManager(int id)
    {
        var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var success = await _approvalService.ApproveManagerAsync(id, adminId);
        if (!success) return BadRequest(ApiResponse<object?>.ErrorResponse("Manager not found or not in Pending status."));
        return Ok(ApiResponse.SuccessResponse("Manager approved successfully."));
    }

    [HttpPut("managers/{id}/reject")]
    public async Task<IActionResult> RejectManager(int id)
    {
        var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var success = await _approvalService.RejectManagerAsync(id, adminId);
        if (!success) return BadRequest(ApiResponse<object?>.ErrorResponse("Manager not found or not in Pending status."));
        return Ok(ApiResponse.SuccessResponse("Manager rejected successfully."));
    }
}
