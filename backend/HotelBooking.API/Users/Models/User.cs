using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace HotelBooking.API.Users.Models;

[Table("Users", Schema = "hotel")]
public class User
{
    public int Id { get; set; }
    public string UserCustomId { get; set; } = string.Empty; // CUST-YYYY-NNNN or MGR-YYYY-NNNN
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public DateTime? DateOfBirth { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public int RoleId { get; set; }
    public Role Role { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    
    public string Status { get; set; } = "Pending"; // Pending, Active, Inactive, Suspended
    public bool ForcePasswordChange { get; set; } = false;
    
    public string? VerificationToken { get; set; }
    public DateTime? VerificationTokenExpiry { get; set; }

    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetTokenExpiry { get; set; }

    public int FailedLoginAttempts { get; set; } = 0;
    public DateTime? LockoutUntil { get; set; }

    // Tokens issued before this timestamp are rejected (logout-from-all-devices, FR-3.6)
    public DateTime? SessionsInvalidatedAt { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal WalletBalance { get; set; } = 0;

    // Replaces the former standalone SavedCards table (JSON column, owned collection).
    public List<SavedCardInfo> SavedCards { get; set; } = new();

    // Path (e.g. "/images/profiles/{guid}_{filename}") to the same compressed image stored below.
    public string? ProfilePhotoUrl { get; set; }

    // Compressed (<=500KB) JPEG bytes — the actual binary lives here (varbinary(max)); ProfilePhotoUrl
    // only records where the same bytes were also written to disk. The original, uncompressed upload
    // is never persisted anywhere.
    public byte[]? ProfilePhotoData { get; set; }
    public string? ProfilePhotoContentType { get; set; }
}
