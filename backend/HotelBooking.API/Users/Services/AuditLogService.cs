using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HotelBooking.API.Common.Services;
using HotelBooking.API.Data;
using HotelBooking.API.Users.Models;

namespace HotelBooking.API.Users.Services;

public class AuditLogService : IAuditLogService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AuditLogService> _logger;

    private const int MaxAttempts = 3;

    public AuditLogService(ApplicationDbContext context, ILogger<AuditLogService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<AuditLog>> GetAuditLogsAsync()
    {
        return await _context.AuditLogs
            .OrderByDescending(a => a.Timestamp)
            .Take(100) // Limit to top 100 for performance
            .ToListAsync();
    }

    public async Task<IEnumerable<AuditLog>> GetAuditLogsByUserAsync(int userId)
    {
        return await _context.AuditLogs
            .Where(a => a.ChangedByUserId == userId)
            .OrderByDescending(a => a.Timestamp)
            .ToListAsync();
    }

    // QA Defect (High): under real concurrent load (e.g. two customers racing for the last room),
    // this insert can hit a genuine SQL Server deadlock (error 1205) against unrelated concurrent
    // writes — not a bug in the caller's own logic, just ordinary lock contention on a busy table.
    // Uncaught, that raw EF/SqlClient exception propagated out of the CALLING business operation
    // (e.g. CreateBookingAsync) even after the booking itself had already committed successfully,
    // which is exactly backwards: a technical hiccup writing the audit trail must never fail (or
    // appear to fail) the business operation that triggered it. Retries with a short backoff first
    // (deadlocked locks normally clear in milliseconds); if it's still failing after retries, this
    // logs the failure to the console (a technical event, not a business one — correctly never
    // written to the AuditLogs table it just failed to write to) and gives up without throwing.
    public async Task LogActionAsync(string entityName, int entityId, string action, string changes, int? changedByUserId)
    {
        var audit = new AuditLog
        {
            EntityName = entityName,
            EntityId = entityId,
            Action = action,
            Changes = changes,
            ChangedByUserId = changedByUserId,
            Timestamp = DateTime.UtcNow
        };

        _context.AuditLogs.Add(audit);

        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            try
            {
                await _context.SaveChangesAsync();
                return;
            }
            catch (Exception ex) when (TransientDbFailure.IsTransient(ex))
            {
                _context.Entry(audit).State = EntityState.Detached;
                _context.AuditLogs.Add(audit);

                if (attempt == MaxAttempts)
                {
                    _logger.LogError(ex,
                        "Failed to write audit log ({EntityName}/{Action}, EntityId={EntityId}) after {Attempts} attempts — giving up without failing the calling operation.",
                        entityName, action, entityId, MaxAttempts);
                    return;
                }

                _logger.LogWarning(ex,
                    "Transient failure writing audit log ({EntityName}/{Action}) on attempt {Attempt}/{MaxAttempts} — retrying.",
                    entityName, action, attempt, MaxAttempts);
                await Task.Delay(100 * attempt);
            }
        }
    }
}
