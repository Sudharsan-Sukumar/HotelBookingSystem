using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HotelBooking.API.Users.Models;
using HotelBooking.API.Features.Hotels.Models;
using HotelBooking.API.Features.Rooms.Models;

namespace HotelBooking.API.Features.Bookings.Models;

[Table("Bookings", Schema = "hotel")]
public class Booking
{
    public int Id { get; set; }

    public string BookingCustomId { get; set; } = string.Empty;

    public int UserId { get; set; }
    public User User { get; set; } = null!;
    
    public int HotelId { get; set; }
    public Hotel Hotel { get; set; } = null!;

    public int RoomTypeId { get; set; }
    public RoomType RoomType { get; set; } = null!;

    public DateTime CheckInDate { get; set; }
    public DateTime CheckOutDate { get; set; }
    
    public int NumberOfRooms { get; set; }

    [MaxLength(500)]
    public string? SpecialRequests { get; set; }

    // Guest identity captured at booking time (replaces the former, always-empty Guests table).
    // Only meaningful for Confirmed/CheckedIn/CheckedOut/Completed bookings — see
    // BookingService.MapToDto for the display rule.
    [MaxLength(50)]
    public string IDProofType { get; set; } = string.Empty; // Aadhar Card, Passport, Driver's License, PAN

    // Stores a BCrypt hash of the guest's ID proof number, never the plain value (bcrypt hashes are
    // always 60 chars; 255 leaves headroom without ever needing another width migration). Hash it
    // with BookingService.HashIdProofNumber before assigning; verify with VerifyIdProofNumber — the
    // original value is not recoverable and must never be stored or logged elsewhere.
    [MaxLength(255)]
    public string IDProofNumber { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal BaseCost { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxAmount { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal WalletAmountUsed { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalAmount { get; set; }

    public string Status { get; set; } = "Pending"; // Pending, Confirmed, CheckedIn, CheckedOut, Cancelled, Completed
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CancelledAt { get; set; }

    // FR-13.4 / Edge Case: payment must complete before this, or the payment attempt is rejected as expired.
    public DateTime? PaymentSessionExpiresAt { get; set; }

    // Admin Edge Case #15: the cancellation refund policy in effect at BOOKING TIME, snapshotted
    // here so a later admin change to the system-wide policy never retroactively changes what an
    // already-placed booking is entitled to on cancellation — only bookings created after a policy
    // change pick up the new thresholds. See BookingService.CancelBookingAsync/AdminCancelBookingAsync.
    public double FullRefundHoursThreshold { get; set; } = 48;
    public double PartialRefundHoursThreshold { get; set; } = 24;
    [Column(TypeName = "decimal(5,4)")]
    public decimal PartialRefundPercentage { get; set; } = 0.5m;

    // Default placeholder only matters to EF Core's InMemory test provider, which (unlike SQL
    // Server) requires every non-nullable property to have a value on insert — SQL Server's real
    // rowversion column is server-computed and excluded from the actual INSERT statement, so this
    // default is never what ends up persisted there.
    [Timestamp]
    public byte[] RowVersion { get; set; } = new byte[8];
}
