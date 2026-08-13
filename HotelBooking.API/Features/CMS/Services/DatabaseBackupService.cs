using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using HotelBooking.API.Data;
using HotelBooking.API.Features.CMS.Models;

namespace HotelBooking.API.Features.CMS.Services;

public class DatabaseBackupService : IDatabaseBackupService
{
    private readonly ApplicationDbContext _context;

    public DatabaseBackupService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<DatabaseBackup>> GetAllBackupsAsync()
    {
        return await _context.DatabaseBackups.OrderByDescending(b => b.CreatedAt).ToListAsync();
    }

    public async Task<DatabaseBackup> TriggerManualBackupAsync(string adminEmail)
    {
        // In a real scenario, this would execute a SQL backup command or trigger an external job.
        // For now, we simulate the backup and log it.
        
        var backup = new DatabaseBackup
        {
            BackupId = Guid.NewGuid().ToString(),
            FileName = $"Backup_{DateTime.UtcNow:yyyyMMdd_HHmmss}.bak",
            Size = "15 MB", // Simulated size
            BackupType = "Manual",
            Status = "Completed",
            CreatedBy = adminEmail,
            CreatedAt = DateTime.UtcNow,
            SchemaVersion = "V2" // Current version
        };

        _context.DatabaseBackups.Add(backup);
        await _context.SaveChangesAsync();
        return backup;
    }

    public async Task<bool> RestoreBackupAsync(int backupId)
    {
        var backup = await _context.DatabaseBackups.FindAsync(backupId);
        if (backup == null) throw new ArgumentException("Backup not found.");

        // Edge Case 11: Admin tries to restore a V1 backup to V2 schema
        if (backup.SchemaVersion != "V2")
        {
            throw new InvalidOperationException($"Cannot restore backup. Schema version mismatch. Backup is {backup.SchemaVersion}, current is V2.");
        }

        // Simulate restore process
        return true;
    }
}
