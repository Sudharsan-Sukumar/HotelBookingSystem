using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Users.Models;

namespace HotelBooking.API.Users.Services;

public interface ISecurityAuditLogService
{
    Task LogAsync(string eventType, string? email, int? userId, bool success, string? reason = null, string? ipAddress = null, string? correlationId = null);
    Task<IEnumerable<SecurityAuditLog>> GetRecentAsync(int take = 200);
}
