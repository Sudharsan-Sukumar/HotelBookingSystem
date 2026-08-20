using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using HotelBooking.API.Data;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Models;

namespace HotelBooking.API.Features.CMS.Services;

// Backup & Recovery Strategy — real SQL Server BACKUP DATABASE / RESTORE DATABASE, not a simulated
// metadata row (that was the previous implementation: it wrote a fake "15 MB" size and never touched
// SQL Server at all). What's implemented here vs what a production deployment additionally requires:
//
//   IMPLEMENTED (this class):
//     - Full backup via BACKUP DATABASE ... WITH CHECKSUM (detects page corruption during the backup
//       write itself, not just on restore).
//     - Backup verification via RESTORE VERIFYONLY immediately after the backup completes — catches a
//       corrupt/truncated backup file right away instead of discovering it during a real disaster.
///    - A real restore path: ALTER DATABASE ... SET SINGLE_USER (drops other connections so the
//       restore can take an exclusive lock) -> RESTORE DATABASE ... WITH REPLACE -> SET MULTI_USER,
//       with MULTI_USER guaranteed to run even if the restore itself fails (try/finally).
//     - Schema-version guard and staleness/confirmation guard, unchanged from before.
//     - RPO/RTO stated below.
//
//   PRODUCTION DEPLOYMENT REQUIREMENT (not implemented here — needs real infrastructure):
//     - Differential and transaction-log backups on a schedule (e.g. full nightly, differential every
//       6h, log every 15 min) via SQL Server Agent jobs or a maintenance plan — this class only takes
//       an on-demand full backup.
//     - Off-site/off-machine storage: backups here land on the same disk as the database. A real
//       disaster (disk failure) takes the backup down with the database. Production must copy the
//       .bak file to a separate physical location (Azure Blob Storage / S3 / a network share) —
//       BackupSettings:Directory should point at a mounted off-box location once that exists.
//     - Scheduled restore-drill testing (restoring to a scratch database on a schedule to prove
//       backups are actually restorable, not just present) — not automated here.
//     - RPO/RTO as currently achievable with only on-demand full backups: RPO = "since last manual
//       backup" (could be hours/days — unacceptable for production, hence the log-backup requirement
//       above), RTO = time to copy + restore the .bak file (single-digit minutes for a database this
//       size). A production deployment with 15-minute log backups would bring RPO down to ~15 minutes.
public class DatabaseBackupService : IDatabaseBackupService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<DatabaseBackupService> _logger;
    private readonly string? _configuredBackupDirectory;

    private const string CurrentSchemaVersion = "V2";

    public DatabaseBackupService(ApplicationDbContext context, ILogger<DatabaseBackupService> logger, Microsoft.Extensions.Configuration.IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        // BACKUP DATABASE writes to a path on the SQL SERVER machine, not the app's own filesystem —
        // co-located only because this is a local dev setup. BackupSettings:Directory lets a
        // production deployment point this at an off-box/off-site location the SQL Server service
        // account can write to (see class remarks); left unset, this falls back to SQL Server's own
        // configured default backup path (SERVERPROPERTY('InstanceDefaultBackupPath')), which is
        // guaranteed to already be writable by that service account.
        _configuredBackupDirectory = configuration["BackupSettings:Directory"];
    }

    private async Task<string> GetBackupDirectoryAsync()
    {
        if (!string.IsNullOrWhiteSpace(_configuredBackupDirectory))
            return _configuredBackupDirectory;

        var connection = _context.Database.GetDbConnection();
        var wasClosed = connection.State != System.Data.ConnectionState.Open;
        if (wasClosed) await connection.OpenAsync();
        try
        {
            using var command = connection.CreateCommand();
            command.CommandText = "SELECT SERVERPROPERTY('InstanceDefaultBackupPath')";
            var result = await command.ExecuteScalarAsync();
            return result as string ?? throw new InvalidOperationException("Could not determine SQL Server's default backup path, and BackupSettings:Directory is not configured.");
        }
        finally
        {
            if (wasClosed) await connection.CloseAsync();
        }
    }

    public async Task<IEnumerable<DatabaseBackup>> GetAllBackupsAsync()
    {
        return await _context.DatabaseBackups.OrderByDescending(b => b.CreatedAt).ToListAsync();
    }

    public async Task<DatabaseBackup> TriggerManualBackupAsync(string adminEmail)
    {
        var databaseName = _context.Database.GetDbConnection().Database;
        var fileName = $"Backup_{DateTime.UtcNow:yyyyMMdd_HHmmss}.bak";
        var backupDirectory = await GetBackupDirectoryAsync();
        var filePath = Path.Combine(backupDirectory, fileName);

        var backup = new DatabaseBackup
        {
            BackupId = Guid.NewGuid().ToString(),
            FileName = fileName,
            BackupType = "Manual",
            CreatedBy = adminEmail,
            CreatedAt = DateTime.UtcNow,
            SchemaVersion = CurrentSchemaVersion
        };

        try
        {
            // Database names can't be parameterized (SQL Server doesn't allow a bound parameter as an
            // identifier) — safe here because it comes from our own connection string, never from
            // user input, so it's quoted with QUOTENAME-equivalent brackets and interpolated directly.
            // The file path and backup label ARE user/timestamp-derived values, so those stay
            // parameterized via {N} placeholders (EF turns these into real SqlParameters).
            //
            // WITH CHECKSUM asks SQL Server to validate page checksums while reading and to compute
            // a checksum over the backup stream itself, so page-level corruption is caught here
            // rather than silently baked into the .bak file.
#pragma warning disable EF1002 // Only the identifier is interpolated (escaped above); the file path/label stay as real {N} SqlParameters.
            await _context.Database.ExecuteSqlRawAsync(
                $"BACKUP DATABASE [{EscapeIdentifier(databaseName)}] TO DISK = {{0}} WITH INIT, CHECKSUM, NAME = {{1}}",
                filePath, $"Manual backup {DateTime.UtcNow:O}");
#pragma warning restore EF1002

            // Backup Verification — RESTORE VERIFYONLY checks the backup file is readable and its
            // checksums are intact without actually restoring it. If this fails, the backup is
            // unusable even though the BACKUP DATABASE call above reported success.
            await _context.Database.ExecuteSqlRawAsync(
                "RESTORE VERIFYONLY FROM DISK = {0}", filePath);

            var fileInfo = new FileInfo(filePath);
            backup.Size = FormatSize(fileInfo.Exists ? fileInfo.Length : 0);
            backup.Status = "Completed";

            _logger.LogInformation("Database backup {FileName} completed and verified ({Size}).", fileName, backup.Size);
        }
        catch (Exception ex)
        {
            backup.Status = "Failed";
            backup.Size = "0 B";
            _logger.LogError(ex, "Database backup {FileName} failed.", fileName);
        }

        _context.DatabaseBackups.Add(backup);
        await _context.SaveChangesAsync();
        return backup;
    }

    public async Task<RestoreBackupResultDto> RestoreBackupAsync(int backupId, bool confirm)
    {
        var backup = await _context.DatabaseBackups.FindAsync(backupId);
        if (backup == null) throw new ArgumentException("Backup not found.");

        if (backup.Status != "Completed")
            throw new InvalidOperationException("Cannot restore a backup that did not complete successfully.");

        // Guard Clause — blocks restoring a backup whose SchemaVersion doesn't match the current schema.
        // Edge Case 11: Admin tries to restore a V1 backup to V2 schema
        if (backup.SchemaVersion != CurrentSchemaVersion)
        {
            throw new InvalidOperationException($"Cannot restore backup. Schema version mismatch. Backup is {backup.SchemaVersion}, current is {CurrentSchemaVersion}.");
        }

        // Staleness / Confirmation Guard - a backup older than the most recent one is "outdated"; restoring it silently could clobber newer data, so it must come back as a warning requiring explicit confirmation instead of a hard error or a silent restore.
        var mostRecentBackupDate = await _context.DatabaseBackups
            .Where(b => b.Status == "Completed")
            .MaxAsync(b => (DateTime?)b.CreatedAt);
        bool isOutdated = mostRecentBackupDate.HasValue && backup.CreatedAt < mostRecentBackupDate.Value;

        if (isOutdated && !confirm)
        {
            return new RestoreBackupResultDto
            {
                Success = false,
                RequiresConfirmation = true,
                Message = $"This backup from {backup.CreatedAt:yyyy-MM-dd HH:mm} UTC is older than the most recent backup ({mostRecentBackupDate:yyyy-MM-dd HH:mm} UTC). Resend with confirm=true to restore it anyway."
            };
        }

        var backupDirectory = await GetBackupDirectoryAsync();
        var filePath = Path.Combine(backupDirectory, backup.FileName);

        // Deliberately NOT pre-checking File.Exists(filePath) here: the backup directory lives on
        // the SQL Server host's filesystem, which the app process may lack read permission on even
        // when the file is genuinely present (observed in practice against SQL Server's own default
        // backup path — a locked-down folder the app user can't list, though the SQL Server service
        // account that WROTE the backup can). File.Exists() silently returns false for "access
        // denied" the same as it does for "doesn't exist", which would make this check actively
        // misleading rather than merely redundant. RESTORE DATABASE below — which runs as the SQL
        // Server service account, not the app process — is the only place a missing-vs-inaccessible
        // distinction can be made correctly, so it is the sole, authoritative check.

        var databaseName = _context.Database.GetDbConnection().Database;

        // RESTORE DATABASE cannot run on a connection that is itself connected to the target
        // database (SQL Server rejects it: "RESTORE cannot process database ... because it is in
        // use by this session"). EF's own DbContext connection stays bound to that database, so
        // this needs its own ADO.NET connection pointed at "master" instead — the standard way any
        // DBA tool performs a restore.
        var quotedDbName = EscapeIdentifier(databaseName);
        var masterConnectionString = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(_context.Database.GetConnectionString())
        {
            InitialCatalog = "master"
        }.ConnectionString;

        using var masterConnection = new Microsoft.Data.SqlClient.SqlConnection(masterConnectionString);
        await masterConnection.OpenAsync();

        try
        {
            // Restoring requires exclusive access to the database, so every other connection
            // (including the app's own connection pool) must be dropped first.
            await ExecuteAsync(masterConnection, $"ALTER DATABASE [{quotedDbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE");
            await ExecuteAsync(masterConnection, $"RESTORE DATABASE [{quotedDbName}] FROM DISK = @path WITH REPLACE", ("@path", filePath));

            _logger.LogWarning("Database {DatabaseName} restored from backup {FileName} (BackupId={BackupId}).",
                databaseName, backup.FileName, backup.BackupId);

            return new RestoreBackupResultDto
            {
                Success = true,
                RequiresConfirmation = false,
                Message = "Backup restored successfully."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Restore of backup {FileName} (BackupId={BackupId}) failed.", backup.FileName, backup.BackupId);
            return new RestoreBackupResultDto
            {
                Success = false,
                RequiresConfirmation = false,
                Message = $"Restore failed: {ex.Message}"
            };
        }
        finally
        {
            // Always put the database back into MULTI_USER mode, even if the restore itself failed —
            // otherwise every subsequent request from the app would fail with "database is in single
            // user mode" on top of whatever the original failure was.
            try
            {
                await ExecuteAsync(masterConnection, $"ALTER DATABASE [{quotedDbName}] SET MULTI_USER");
            }
            catch (Exception ex)
            {
                _logger.LogCritical(ex, "Failed to return {DatabaseName} to MULTI_USER mode after a restore attempt — manual intervention required.", databaseName);
            }
        }
    }

    private static async Task ExecuteAsync(Microsoft.Data.SqlClient.SqlConnection connection, string commandText, params (string Name, object Value)[] parameters)
    {
        using var command = connection.CreateCommand();
        command.CommandText = commandText;
        foreach (var (name, value) in parameters)
            command.Parameters.AddWithValue(name, value);
        await command.ExecuteNonQueryAsync();
    }

    // Database identifiers can't be SQL parameters, so this doubles any "]" the same way SQL Server's
    // own QUOTENAME() does — defense in depth even though the name only ever comes from our trusted
    // connection string, never from user input.
    private static string EscapeIdentifier(string identifier) => identifier.Replace("]", "]]");

    private static string FormatSize(long bytes)
    {
        if (bytes >= 1024 * 1024)
            return $"{bytes / (1024.0 * 1024.0):F1} MB";
        if (bytes >= 1024)
            return $"{bytes / 1024.0:F1} KB";
        return $"{bytes} B";
    }
}
