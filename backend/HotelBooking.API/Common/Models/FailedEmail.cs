using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelBooking.API.Common.Models;

// Dead-Letter Pattern - durable record of an email whose retries were fully exhausted, so a dropped notification is inspectable/recoverable later instead of existing only as a console log line.
[Table("FailedEmails", Schema = "hotel")]
public class FailedEmail
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(320)]
    public string To { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public string Body { get; set; } = string.Empty;

    [Required]
    [MaxLength(1000)]
    public string FailureReason { get; set; } = string.Empty;

    public DateTime FailedAt { get; set; } = DateTime.UtcNow;
}
