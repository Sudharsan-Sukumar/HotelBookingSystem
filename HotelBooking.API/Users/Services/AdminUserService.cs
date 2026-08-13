using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Users.DTOs;
using HotelBooking.API.Users.Models;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

namespace HotelBooking.API.Users.Services;

public class AdminUserService : IAdminUserService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;

    public AdminUserService(ApplicationDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
    {
        return await _context.Users
            .Include(u => u.Role)
            .Select(u => new UserDto
            {
                Id = u.Id,
                UserCustomId = u.UserCustomId,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Email = u.Email,
                Phone = u.Phone,
                RoleName = u.Role != null ? u.Role.Name : string.Empty,
                Status = u.Status,
                CreatedAt = u.CreatedAt,
                ProfilePhotoUrl = u.ProfilePhotoUrl
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
            UserCustomId = user.UserCustomId,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Phone = user.Phone,
            RoleName = user.Role != null ? user.Role.Name : string.Empty,
            Status = user.Status,
            CreatedAt = user.CreatedAt,
            ProfilePhotoUrl = user.ProfilePhotoUrl
        };
    }

    private static string CustomIdPrefixFor(string roleName) => roleName switch
    {
        "Admin" => "ADM",
        "Manager" => "MGR",
        _ => "CUST"
    };

    private async Task<string> GenerateUserCustomIdAsync(string roleName)
    {
        var prefix = CustomIdPrefixFor(roleName);
        var existingIds = await _context.Users
            .Where(u => u.UserCustomId != null && u.UserCustomId.StartsWith(prefix + "-"))
            .Select(u => u.UserCustomId)
            .ToListAsync();
        int nextSequence = existingIds
            .Select(id => int.TryParse(id.Split('-').LastOrDefault(), out var n) ? n : 0)
            .DefaultIfEmpty(0)
            .Max() + 1;
        return $"{prefix}-{System.DateTime.UtcNow.Year}-{nextSequence:D4}";
    }

    public async Task<UserDto> CreateUserAsync(CreateUserDto dto)
    {
        // QA Defect (High): this used to insert straight into the DB with no pre-checks at all,
        // so a duplicate email or a nonexistent RoleId surfaced as a raw unhandled 500 from the
        // DB's unique-constraint/FK violation instead of a clean validation error — mirrors the
        // checks CreateManagerAsync already does correctly.
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        if (await _context.Users.AnyAsync(u => u.Email == normalizedEmail))
            throw new InvalidOperationException("Email already registered.");

        if (await _context.Users.AnyAsync(u => u.Phone == dto.Phone))
            throw new InvalidOperationException("Phone number already registered.");

        var role = await _context.Roles.FindAsync(dto.RoleId);
        if (role == null)
            throw new ArgumentException("Invalid role.");

        var user = new User
        {
            // QA Defect (Medium): admin-created users never got a UserCustomId (stayed ""),
            // inconsistent with self-registration (AuthService.RegisterAsync) and manager-creation
            // (CreateManagerAsync), which both generate one.
            UserCustomId = await GenerateUserCustomIdAsync(role.Name),
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password, workFactor: 12),
            RoleId = dto.RoleId,
            Phone = dto.Phone,
            Status = dto.Status
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _auditLogService.LogActionAsync(
            "User", user.Id, "Create",
            $"User created: {user.FirstName} {user.LastName} ({user.Email}), Role: {(role != null ? role.Name : "Unknown")}, Status: {user.Status}.",
            null);

        return new UserDto
        {
            Id = user.Id,
            UserCustomId = user.UserCustomId,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Phone = user.Phone,
            RoleName = role != null ? role.Name : string.Empty,
            Status = user.Status,
            CreatedAt = user.CreatedAt,
            ProfilePhotoUrl = user.ProfilePhotoUrl
        };
    }

    public async Task<UserDto?> UpdateUserAsync(int id, UpdateUserDto dto)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null) return null;

        // Same gap as CreateUserAsync: an invalid RoleId or an email collision with a DIFFERENT
        // user used to hit the DB's FK/unique-constraint and surface as a raw unhandled 500.
        var updatedRole = await _context.Roles.FindAsync(dto.RoleId);
        if (updatedRole == null)
            throw new ArgumentException("Invalid role.");

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        if (await _context.Users.AnyAsync(u => u.Id != id && u.Email == normalizedEmail))
            throw new InvalidOperationException("Email already registered.");

        if (await _context.Users.AnyAsync(u => u.Id != id && u.Phone == dto.Phone))
            throw new InvalidOperationException("Phone number already registered.");

        var oldRoleId = user.RoleId;
        var oldRoleName = user.Role != null ? user.Role.Name : string.Empty;
        var oldStatus = user.Status;

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.Email = normalizedEmail;
        user.RoleId = dto.RoleId;
        user.Phone = dto.Phone;
        user.Status = dto.Status;

        await _context.SaveChangesAsync();

        var newRoleName = updatedRole != null ? updatedRole.Name : string.Empty;

        var changeDetails = $"User {id} updated.";
        if (oldRoleId != dto.RoleId)
            changeDetails += $" Role: {oldRoleName} -> {newRoleName}.";
        if (oldStatus != dto.Status)
            changeDetails += $" Status: {oldStatus} -> {dto.Status}.";

        await _auditLogService.LogActionAsync(
            "User", id, "Update", changeDetails, null);

        return new UserDto
        {
            Id = user.Id,
            UserCustomId = user.UserCustomId,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Phone = user.Phone,
            RoleName = updatedRole != null ? updatedRole.Name : string.Empty,
            Status = user.Status,
            CreatedAt = user.CreatedAt,
            ProfilePhotoUrl = user.ProfilePhotoUrl
        };
    }

    public async Task<bool> DeleteUserAsync(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return false;

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        await _auditLogService.LogActionAsync(
            "User", id, "Delete",
            $"User {id} ({user.FirstName} {user.LastName}, {user.Email}) deleted.",
            null);

        return true;
    }

    public async Task<UserDto> CreateManagerAsync(CreateManagerDto dto)
    {
        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        if (await _context.Users.AnyAsync(u => u.Email == normalizedEmail))
            throw new InvalidOperationException("Email already registered.");

        if (await _context.Users.AnyAsync(u => u.Phone == dto.Phone))
            throw new InvalidOperationException("Phone number already registered.");

        var hotel = await _context.Hotels.FindAsync(dto.AssignedHotelId);
        if (hotel == null)
            throw new ArgumentException("Hotel not found. Please create the hotel first.");

        if (hotel.ManagerIds.Count >= 2)
            throw new InvalidOperationException("Maximum manager limit (2) reached for this hotel.");

        var managerRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == "Manager");
        if (managerRole == null)
            throw new InvalidOperationException("Manager role is not configured.");

        var existingIds = await _context.Users
            .Where(u => u.UserCustomId != null && u.UserCustomId.StartsWith("MGR-"))
            .Select(u => u.UserCustomId)
            .ToListAsync();
        int nextSequence = existingIds
            .Select(id => int.TryParse(id.Split('-').LastOrDefault(), out var n) ? n : 0)
            .DefaultIfEmpty(0)
            .Max() + 1;
        string customId = $"MGR-{System.DateTime.UtcNow.Year}-{nextSequence:D4}";

        var manager = new User
        {
            UserCustomId = customId,
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim(),
            Email = normalizedEmail,
            Phone = dto.Phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.TemporaryPassword, workFactor: 12),
            RoleId = managerRole.Id,
            Status = "Active",
            ForcePasswordChange = true
        };

        _context.Users.Add(manager);
        await _context.SaveChangesAsync();

        hotel.ManagerIds.Add(manager.Id);
        await _context.SaveChangesAsync();

        await _auditLogService.LogActionAsync(
            "User", manager.Id, "Create",
            $"Manager created: {manager.FirstName} {manager.LastName} ({manager.Email}), assigned to hotel {hotel.Id} ({hotel.Name}).",
            null);

        return new UserDto
        {
            Id = manager.Id,
            UserCustomId = manager.UserCustomId,
            FirstName = manager.FirstName,
            LastName = manager.LastName,
            Email = manager.Email,
            Phone = manager.Phone,
            RoleName = managerRole.Name,
            Status = manager.Status,
            CreatedAt = manager.CreatedAt,
            ProfilePhotoUrl = manager.ProfilePhotoUrl
        };
    }
}
