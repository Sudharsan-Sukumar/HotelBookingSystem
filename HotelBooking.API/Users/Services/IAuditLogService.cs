using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Users.Models;

namespace HotelBooking.API.Users.Services;

public interface IAuditLogService
{
    Task<IEnumerable<AuditLog>> GetAuditLogsAsync();
    Task<IEnumerable<AuditLog>> GetAuditLogsByUserAsync(int userId);
    Task LogActionAsync(string entityName, int entityId, string action, string changes, int? changedByUserId);
}
