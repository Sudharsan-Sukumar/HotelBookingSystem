using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Users.DTOs;
using HotelBooking.API.Features.Users.Models;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

namespace HotelBooking.API.Features.Users.Services;

public class AdminUserService : IAdminUserService
{
    private readonly ApplicationDbContext _context;

    public AdminUserService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
    {
        return await _context.Users
            .Include(u => u.Role)
            .Select(u => new UserDto
            {
                Id = u.Id,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Email = u.Email,
                Phone = u.Phone,
                RoleName = u.Role != null ? u.Role.Name : string.Empty,
                Status = u.Status,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<UserDto?> GetUserByIdAsync(int id)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null) return null;

        return new UserDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Phone = user.Phone,
            RoleName = user.Role != null ? user.Role.Name : string.Empty,
            Status = user.Status,
            CreatedAt = user.CreatedAt
        };
    }

    public async Task<UserDto> CreateUserAsync(CreateUserDto dto)
    {
        var role = await _context.Roles.FindAsync(dto.RoleId);
        var user = new User
        {
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password, workFactor: 12),
            RoleId = dto.RoleId,
            Phone = dto.Phone,
            Status = dto.Status
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return new UserDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Phone = user.Phone,
            RoleName = role != null ? role.Name : string.Empty,
            Status = user.Status,
            CreatedAt = user.CreatedAt
        };
    }

    public async Task<UserDto?> UpdateUserAsync(int id, UpdateUserDto dto)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null) return null;

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.Email = dto.Email;
        user.RoleId = dto.RoleId;
        user.Phone = dto.Phone;
        user.Status = dto.Status;

        await _context.SaveChangesAsync();

        var updatedRole = await _context.Roles.FindAsync(dto.RoleId);

        return new UserDto
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Phone = user.Phone,
            RoleName = updatedRole != null ? updatedRole.Name : string.Empty,
            Status = user.Status,
            CreatedAt = user.CreatedAt
        };
    }

    public async Task<bool> DeleteUserAsync(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return false;

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
        return true;
    }
}
