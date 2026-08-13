using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Users.Services;
using HotelBooking.API.Users.Models;
using HotelBooking.API.Common.Models;

namespace HotelBooking.API.Users.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
[ApiExplorerSettings(GroupName = "Admin")]
public class RolesController : ControllerBase
{
    private readonly IRoleService _roleService;

    public RolesController(IRoleService roleService)
    {
        _roleService = roleService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var roles = await _roleService.GetAllRolesAsync();
        return Ok(ApiResponse<IEnumerable<Role>>.SuccessResponse(roles));
    }

    public class CreateRoleDto
    {
        public string Name { get; set; } = string.Empty;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoleDto dto)
    {
        var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role = await _roleService.CreateRoleAsync(dto.Name, adminId);
        return Ok(ApiResponse<Role>.SuccessResponse(role, "Role created successfully."));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var adminId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var success = await _roleService.DeleteRoleAsync(id, adminId);
        if (!success) return NotFound(ApiResponse<object?>.ErrorResponse("Role not found."));
        return Ok(ApiResponse.SuccessResponse("Role deleted successfully."));
    }
}
