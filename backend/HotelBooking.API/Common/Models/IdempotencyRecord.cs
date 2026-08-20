using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelBooking.API.Common.Models;

// Idempotency-Key Persistence - a DB-backed record so a replayed response for a given key survives
// an app restart and is visible across multiple instances, unlike the prior IMemoryCache-only store
// (process-local, wiped on restart, invisible to other instances).
[Table("IdempotencyRecords", Schema = "hotel")]
public class IdempotencyRecord
{
    public int Id { get; set; }

    public string Key { get; set; } = string.Empty;

    public int ResponseStatusCode { get; set; }

    [Column(TypeName = "nvarchar(max)")]
    public string ResponseBody { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
