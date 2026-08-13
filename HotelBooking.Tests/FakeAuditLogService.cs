using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Users.Models;
using HotelBooking.API.Users.Services;

namespace HotelBooking.Tests;

internal class FakeAuditLogService : IAuditLogService
{
    public List<(string EntityName, int EntityId, string Action, string Changes, int? ChangedByUserId)> LoggedActions { get; } = new();

    public Task<IEnumerable<AuditLog>> GetAuditLogsAsync() => Task.FromResult<IEnumerable<AuditLog>>(new List<AuditLog>());
    public Task<IEnumerable<AuditLog>> GetAuditLogsByUserAsync(int userId) => Task.FromResult<IEnumerable<AuditLog>>(new List<AuditLog>());

    public Task LogActionAsync(string entityName, int entityId, string action, string changes, int? changedByUserId)
    {
        LoggedActions.Add((entityName, entityId, action, changes, changedByUserId));
        return Task.CompletedTask;
    }
}
