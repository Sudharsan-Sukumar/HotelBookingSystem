using System;
using System.Threading;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace HotelBooking.API.Users.Services;

// Audit Log Retention Policy:
//   Business audit logs (AuditLogs — bookings, payments, refunds, admin governance actions):
//     retained 365 days. These back disputes/refund investigations and admin accountability
//     reviews, which can surface up to a year after the fact (tax year, chargeback windows).
//   Security/technical audit logs (SecurityAuditLogs — login/logout/lockout/token events):
//     retained 90 days. Their value is almost entirely for near-term incident investigation
//     (a compromised account gets noticed in days/weeks, not months) and they accumulate far
//     faster (every login attempt), so a shorter window bounds table growth.
// After the retention period, rows are hard-deleted (no archival tier exists in this project —
// see the class remarks in DatabaseBackupService for how a production deployment would instead
// archive to cold storage before deleting). Enforcement is a nightly sweep, mirroring the
// polling-loop/fresh-DbContext-scope-per-tick pattern used by AbandonedBookingCleanupService.
public class AuditLogRetentionService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<AuditLogRetentionService> _logger;

    public static readonly TimeSpan BusinessAuditRetention = TimeSpan.FromDays(365);
    public static readonly TimeSpan SecurityAuditRetention = TimeSpan.FromDays(90);

    private static readonly TimeSpan SweepInterval = TimeSpan.FromHours(24);

    public AuditLogRetentionService(IServiceScopeFactory scopeFactory, ILogger<AuditLogRetentionService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Audit Log Retention Service is starting.");

        using var timer = new PeriodicTimer(SweepInterval);
        do
        {
            try
            {
                await PurgeOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                // A purge-pass failure must never crash the background loop — log and retry next tick.
                _logger.LogError(ex, "Audit log retention purge failed.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task PurgeOnceAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var businessCutoff = DateTime.UtcNow - BusinessAuditRetention;
        var securityCutoff = DateTime.UtcNow - SecurityAuditRetention;

        var deletedBusiness = await context.AuditLogs
            .Where(a => a.Timestamp < businessCutoff)
            .ExecuteDeleteAsync(stoppingToken);

        var deletedSecurity = await context.SecurityAuditLogs
            .Where(a => a.Timestamp < securityCutoff)
            .ExecuteDeleteAsync(stoppingToken);

        if (deletedBusiness > 0 || deletedSecurity > 0)
        {
            _logger.LogInformation(
                "Audit log retention purge: removed {BusinessCount} business AuditLog row(s) older than {BusinessDays} days and {SecurityCount} SecurityAuditLog row(s) older than {SecurityDays} days.",
                deletedBusiness, BusinessAuditRetention.TotalDays, deletedSecurity, SecurityAuditRetention.TotalDays);
        }
    }
}
