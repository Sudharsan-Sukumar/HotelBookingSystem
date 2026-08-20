using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Users.Models;
using HotelBooking.API.Users.Services;

namespace HotelBooking.Tests;

internal class FakeSecurityAuditLogService : ISecurityAuditLogService
{
    public List<(string EventType, string? Email, int? UserId, bool Success, string? Reason)> LoggedEvents { get; } = new();

    public Task LogAsync(string eventType, string? email, int? userId, bool success, string? reason = null, string? ipAddress = null, string? correlationId = null)
    {
        LoggedEvents.Add((eventType, email, userId, success, reason));
        return Task.CompletedTask;
    }

    public Task<IEnumerable<SecurityAuditLog>> GetRecentAsync(int take = 200) => Task.FromResult<IEnumerable<SecurityAuditLog>>(new List<SecurityAuditLog>());
}
