using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelBooking.API.Users.Models;

// Technical/security audit trail — distinct from the business AuditLogs table (bookings, payments,
// admin actions). Captures authentication/session events (login, failed login, lockout, logout,
// token refresh/revocation) so they're queryable by an admin instead of only living in console logs.
[Table("SecurityAuditLogs", Schema = "hotel")]
public class SecurityAuditLog
{
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string EventType { get; set; } = string.Empty; // LoginSucceeded, LoginFailed, AccountLockedOut, Logout, LogoutAllDevices, TokenRefreshed, TokenRefreshRejected

    [MaxLength(256)]
    public string? Email { get; set; }

    public int? UserId { get; set; }

    [ForeignKey("UserId")]
    public User? User { get; set; }

    public bool Success { get; set; }

    [MaxLength(500)]
    public string? Reason { get; set; }

    [MaxLength(64)]
    public string? IpAddress { get; set; }

    [MaxLength(64)]
    public string? CorrelationId { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
