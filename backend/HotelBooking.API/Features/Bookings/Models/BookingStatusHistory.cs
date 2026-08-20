using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelBooking.API.Features.Bookings.Models;

// Populated exclusively by the trg_Booking_StatusChange SQL Server trigger (see the
// AddBookingStatusHistoryTrigger migration) — never written to directly from application code.
// This is the event-driven counterpart to AuditLogService's application-level "Booking"/"StatusChange"
// entries: the trigger captures every status transition at the database layer itself, so even a
// direct SQL update that bypasses BookingService still leaves a record. See that migration's comment
// for why this is implemented as a trigger rather than purely in the application layer.
[Table("BookingStatusHistory", Schema = "hotel")]
public class BookingStatusHistory
{
    public int Id { get; set; }

    public int BookingId { get; set; }

    [ForeignKey("BookingId")]
    public Booking? Booking { get; set; }

    [MaxLength(50)]
    public string OldStatus { get; set; } = string.Empty;

    [MaxLength(50)]
    public string NewStatus { get; set; } = string.Empty;

    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
}
