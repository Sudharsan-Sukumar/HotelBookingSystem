using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using HotelBooking.API.Data;
using HotelBooking.API.Users.Models;

namespace HotelBooking.API.Users.Services;

public class RoleService : IRoleService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditService;

    public RoleService(ApplicationDbContext context, IAuditLogService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    public async Task<IEnumerable<Role>> GetAllRolesAsync()
    {
        return await _context.Roles.ToListAsync();
    }

    public async Task<Role> CreateRoleAsync(string name, int adminId)
    {
        var existing = await _context.Roles.FirstOrDefaultAsync(r => r.Name == name);
        if (existing != null) throw new ArgumentException("Role already exists.");

        var role = new Role { Name = name };
        _context.Roles.Add(role);
        await _context.SaveChangesAsync();
        
        await _auditService.LogActionAsync("Role", role.Id, "CreateRole", $"Created role: {name}", adminId);
        
        return role;
    }

    public async Task<bool> DeleteRoleAsync(int id, int adminId)
    {
        var role = await _context.Roles.FindAsync(id);
        if (role == null) return false;
        
        // Guard Clause — protects the seeded system roles from deletion.
        // Prevent deletion of seeded roles
        if (role.Name == "Admin" || role.Name == "Customer" || role.Name == "Manager")
            throw new InvalidOperationException("Cannot delete system roles.");

        _context.Roles.Remove(role);
        await _auditService.LogActionAsync("Role", id, "DeleteRole", $"Deleted role: {role.Name}", adminId);
        await _context.SaveChangesAsync();
        return true;
    }
}
