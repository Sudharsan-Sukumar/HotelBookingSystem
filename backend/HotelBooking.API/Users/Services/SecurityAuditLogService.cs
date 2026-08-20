using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HotelBooking.API.Data;
using HotelBooking.API.Users.Models;

namespace HotelBooking.API.Users.Services;

// Persists technical/security events (login, logout, lockout, token refresh) separately from the
// business AuditLogs table. Mirrors AuditLogService's "never let an audit write fail the calling
// operation" guarantee, but without the dead-letter/retry machinery since these are lower-stakes,
// best-effort security telemetry rather than an accountability record for a financial action.
public class SecurityAuditLogService : ISecurityAuditLogService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SecurityAuditLogService> _logger;

    public SecurityAuditLogService(ApplicationDbContext context, ILogger<SecurityAuditLogService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task LogAsync(string eventType, string? email, int? userId, bool success, string? reason = null, string? ipAddress = null, string? correlationId = null)
    {
        try
        {
            _context.SecurityAuditLogs.Add(new SecurityAuditLog
            {
                EventType = eventType,
                Email = email,
                UserId = userId,
                Success = success,
                Reason = reason,
                IpAddress = ipAddress,
                CorrelationId = correlationId,
                Timestamp = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to write security audit log ({EventType}, Email={Email}).", eventType, email);
        }
    }

    public async Task<IEnumerable<SecurityAuditLog>> GetRecentAsync(int take = 200)
    {
        return await _context.SecurityAuditLogs
            .OrderByDescending(a => a.Timestamp)
            .Take(take)
            .ToListAsync();
    }
}
