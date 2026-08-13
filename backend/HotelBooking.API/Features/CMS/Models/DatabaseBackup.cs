using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelBooking.API.Features.CMS.Models;

[Table("DatabaseBackups", Schema = "hotel")]
public class DatabaseBackup
{
    public int Id { get; set; }
    public string BackupId { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string BackupType { get; set; } = string.Empty; // Manual or Auto
    public string Status { get; set; } = string.Empty; // Completed or Failed
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string SchemaVersion { get; set; } = "V2"; // Edge Case 11
}
