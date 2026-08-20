using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HotelBooking.API.Common.Services;
using HotelBooking.API.Data;
using HotelBooking.API.Users.Models;

namespace HotelBooking.API.Users.Services;

// Audit Trail Pattern — persists a durable record of Admin governance actions (bans, role changes, approvals) separately from operational logs.
public class AuditLogService : IAuditLogService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AuditLogService> _logger;
    private readonly IWebHostEnvironment _environment;

    private const int MaxAttempts = 3;

    public AuditLogService(ApplicationDbContext context, ILogger<AuditLogService> logger, IWebHostEnvironment environment)
    {
        _context = context;
        _logger = logger;
        _environment = environment;
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

        // Retry-with-Backoff — retries a transient-failing audit insert with increasing delay so a lock-contention hiccup never fails the calling business operation.
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

                    // Durable Dead-Letter Fallback - retries are exhausted, so append the failed entry to a local file instead of losing it, for later manual reconciliation.
                    await TryWriteDeadLetterAsync(audit);
                    return;
                }

                _logger.LogWarning(ex,
                    "Transient failure writing audit log ({EntityName}/{Action}) on attempt {Attempt}/{MaxAttempts} — retrying.",
                    entityName, action, attempt, MaxAttempts);
                await Task.Delay(100 * attempt);
            }
        }
    }

    private async Task TryWriteDeadLetterAsync(AuditLog audit)
    {
        try
        {
            var dataDir = Path.Combine(_environment.ContentRootPath, "App_Data");
            Directory.CreateDirectory(dataDir);
            var filePath = Path.Combine(dataDir, "failed-audit-logs.jsonl");
            var line = JsonSerializer.Serialize(new
            {
                audit.EntityName,
                audit.EntityId,
                audit.Action,
                audit.Changes,
                audit.ChangedByUserId,
                audit.Timestamp
            });
            await File.AppendAllTextAsync(filePath, line + Environment.NewLine);
        }
        catch (Exception fileEx)
        {
            // The dead-letter write itself is a last-resort fallback — if it fails too, just log it.
            // It must never throw and break the calling business operation.
            _logger.LogError(fileEx, "Failed to write dead-letter file for audit log ({EntityName}/{Action}, EntityId={EntityId}).",
                audit.EntityName, audit.Action, audit.EntityId);
        }
    }
}
