using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Users.DTOs;
using HotelBooking.API.Users.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Common.Models;

namespace HotelBooking.API.Users.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "Admin")]
[ApiExplorerSettings(GroupName = "Admin")]
public class AdminUsersController : ControllerBase
{
    private readonly IAdminUserService _adminUserService;

    public AdminUsersController(IAdminUserService adminUserService)
    {
        _adminUserService = adminUserService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetAllUsers()
    {
        var users = await _adminUserService.GetAllUsersAsync();
        return Ok(ApiResponse<IEnumerable<UserDto>>.SuccessResponse(users));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetUser(int id)
    {
        var user = await _adminUserService.GetUserByIdAsync(id);
        if (user == null)
            return NotFound(ApiResponse<object?>.ErrorResponse("User not found."));

        return Ok(ApiResponse<UserDto>.SuccessResponse(user));
    }

    [HttpPost]
    public async Task<ActionResult<UserDto>> CreateUser([FromBody] CreateUserDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object?>.ErrorResponse("Validation failed."));

        try
        {
            var user = await _adminUserService.CreateUserAsync(dto);
            return CreatedAtAction(nameof(GetUser), new { id = user.Id },
                ApiResponse<UserDto>.SuccessResponse(user, "User created successfully."));
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

    [HttpPut("{id}")]
    public async Task<ActionResult<UserDto>> UpdateUser(int id, [FromBody] UpdateUserDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object?>.ErrorResponse("Validation failed."));

        try
        {
            var updatedUser = await _adminUserService.UpdateUserAsync(id, dto);
            if (updatedUser == null)
                return NotFound(ApiResponse<object?>.ErrorResponse("User not found."));

            return Ok(ApiResponse<UserDto>.SuccessResponse(updatedUser, "User updated successfully."));
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

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteUser(int id)
    {
        var success = await _adminUserService.DeleteUserAsync(id);
        if (!success)
            return NotFound(ApiResponse<object?>.ErrorResponse("User not found."));

        return Ok(ApiResponse.SuccessResponse("User deleted successfully."));
    }

    [HttpPost("managers")]
    public async Task<ActionResult<UserDto>> CreateManager([FromBody] CreateManagerDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ApiResponse<object?>.ErrorResponse("Validation failed."));

        try
        {
            var manager = await _adminUserService.CreateManagerAsync(dto);
            return CreatedAtAction(nameof(GetUser), new { id = manager.Id },
                ApiResponse<UserDto>.SuccessResponse(manager, "Manager created successfully."));
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
}
