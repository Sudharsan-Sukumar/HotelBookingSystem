using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelBooking.API.Users.Models;

[Table("AuditLogs", Schema = "hotel")]
public class AuditLog
{
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string EntityName { get; set; } = string.Empty;

    public int EntityId { get; set; }

    [Required]
    [MaxLength(50)]
    public string Action { get; set; } = string.Empty; // Create, Update, Delete, StatusChange

    [MaxLength(2000)]
    public string Changes { get; set; } = string.Empty; // JSON of what changed

    public int? ChangedByUserId { get; set; } // Null if system action
    
    [ForeignKey("ChangedByUserId")]
    public User? ChangedByUser { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
