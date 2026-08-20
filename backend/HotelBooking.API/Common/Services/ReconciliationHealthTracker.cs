using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace HotelBooking.API.Common.Services;

// Heartbeat Pattern — exposes the last time PaymentReconciliationService completed a pass so a
// health check can detect a silently-wedged/crashed background loop instead of only finding out
// when a customer complains their payment never confirmed.
public interface IReconciliationHealthTracker
{
    DateTime? LastSuccessfulRunUtc { get; }
    void RecordSuccess();
}

public class ReconciliationHealthTracker : IReconciliationHealthTracker
{
    public DateTime? LastSuccessfulRunUtc { get; private set; }

    public void RecordSuccess()
    {
        LastSuccessfulRunUtc = DateTime.UtcNow;
    }
}

// ASP.NET Core Health Check - reports unhealthy once the reconciliation heartbeat is older than 3x its 30s poll interval, surfacing a wedged background loop at /health instead of only via missed-payment complaints.
public class ReconciliationHealthCheck : IHealthCheck
{
    private static readonly TimeSpan MaxAge = TimeSpan.FromSeconds(30 * 3);
    private readonly IReconciliationHealthTracker _tracker;

    public ReconciliationHealthCheck(IReconciliationHealthTracker tracker)
    {
        _tracker = tracker;
    }

    public Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        var lastRun = _tracker.LastSuccessfulRunUtc;
        if (lastRun == null)
            return Task.FromResult(HealthCheckResult.Degraded("Reconciliation has not completed a pass yet."));

        var age = DateTime.UtcNow - lastRun.Value;
        return Task.FromResult(age <= MaxAge
            ? HealthCheckResult.Healthy($"Last successful run at {lastRun.Value:o}.")
            : HealthCheckResult.Unhealthy($"Last successful run at {lastRun.Value:o} exceeds max age {MaxAge}."));
    }
}
