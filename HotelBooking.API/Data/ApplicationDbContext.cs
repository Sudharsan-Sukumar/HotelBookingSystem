using HotelBooking.API.Features.Users.Models;
using HotelBooking.API.Features.Auth.Models;
using HotelBooking.API.Features.Hotels.Models;
using HotelBooking.API.Features.Rooms.Models;
using HotelBooking.API.Features.Bookings.Models;
using HotelBooking.API.Features.Payments.Models;
using HotelBooking.API.Features.Housekeeping.Models;
using HotelBooking.API.Features.CMS.Models;
using HotelBooking.API.Features.Reviews.Models;
using Microsoft.EntityFrameworkCore;

using HotelBooking.API.Features.Admin.Models;

namespace HotelBooking.API.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    // Users & Auth
    public DbSet<Role> Roles { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;
    public DbSet<RevocationToken> RevocationTokens { get; set; } = null!;
    public DbSet<AuditLog> AuditLogs { get; set; } = null!;

    // Hotels & Rooms
    public DbSet<Hotel> Hotels { get; set; } = null!;
    public DbSet<HotelManager> HotelManagers { get; set; } = null!;
    public DbSet<Amenity> Amenities { get; set; } = null!;
    public DbSet<HotelAmenity> HotelAmenities { get; set; } = null!;
    public DbSet<RoomType> RoomTypes { get; set; } = null!;
    public DbSet<Room> Rooms { get; set; } = null!;
    public DbSet<HotelImage> HotelImages { get; set; } = null!;
    public DbSet<RoomTypeImage> RoomTypeImages { get; set; } = null!;
    public DbSet<PricingOverride> PricingOverrides { get; set; } = null!;
    public DbSet<Review> Reviews { get; set; } = null!;

    // Bookings & Payments
    public DbSet<Booking> Bookings { get; set; } = null!;
    public DbSet<BookingRoom> BookingRooms { get; set; } = null!;
    public DbSet<Guest> Guests { get; set; } = null!;
    public DbSet<Payment> Payments { get; set; } = null!;
    public DbSet<SavedCard> SavedCards { get; set; } = null!;

    // Operations & CMS
    public DbSet<HousekeepingTask> HousekeepingTasks { get; set; } = null!;
    public DbSet<Notification> Notifications { get; set; } = null!;
    public DbSet<SystemSetting> SystemSettings { get; set; } = null!;
    public DbSet<Promotion> Promotions { get; set; } = null!;
    public DbSet<DatabaseBackup> DatabaseBackups { get; set; } = null!;
    
    // Phase 3 Admin Models
    public DbSet<SupportTicket> SupportTickets { get; set; } = null!;
    public DbSet<Payout> Payouts { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Ensure default schema
        modelBuilder.HasDefaultSchema("hotel");

        // Composite Keys for Join Tables
        modelBuilder.Entity<HotelAmenity>()
            .HasKey(ha => new { ha.HotelId, ha.AmenityId });

        modelBuilder.Entity<HotelManager>()
            .HasKey(hm => new { hm.HotelId, hm.UserId });

        modelBuilder.Entity<BookingRoom>()
            .HasKey(br => new { br.BookingId, br.RoomId });

        // Concurrency Tokens
        modelBuilder.Entity<Payment>()
            .Property(p => p.Amount)
            .HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Hotel>()
            .Property(h => h.AverageRating)
            .HasColumnType("decimal(3,2)");

        // Disable cascade delete for Review to avoid multiple cascade paths
        modelBuilder.Entity<Review>()
            .HasOne(r => r.Customer)
            .WithMany()
            .HasForeignKey(r => r.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Review>()
            .HasOne(r => r.Booking)
            .WithMany()
            .HasForeignKey(r => r.BookingId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Hotel>()
            .Property(h => h.RowVersion)
            .IsRowVersion();

        modelBuilder.Entity<Room>()
            .Property(r => r.RowVersion)
            .IsRowVersion();

        modelBuilder.Entity<Booking>()
            .Property(b => b.RowVersion)
            .IsRowVersion();
            
        modelBuilder.Entity<RoomType>()
            .Property(rt => rt.RowVersion)
            .IsRowVersion();

        // Query Optimization: Non-Clustered Indexes
        modelBuilder.Entity<Hotel>()
            .HasIndex(h => h.Location);
            
        modelBuilder.Entity<Hotel>()
            .HasIndex(h => h.City);

        // Edge Case 18: Duplicate Property (Name + City)
        modelBuilder.Entity<Hotel>()
            .HasIndex(h => new { h.Name, h.City })
            .IsUnique();

        modelBuilder.Entity<Booking>()
            .HasIndex(b => b.UserId);
            
        modelBuilder.Entity<Booking>()
            .HasIndex(b => b.CheckInDate);
            
        modelBuilder.Entity<Booking>()
            .HasIndex(b => b.Status);

        modelBuilder.Entity<Review>()
            .HasIndex(r => new { r.BookingId, r.CustomerId })
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        modelBuilder.Entity<RefreshToken>()
            .HasIndex(rt => rt.Token)
            .IsUnique();

        modelBuilder.Entity<RevocationToken>()
            .HasIndex(rt => rt.Token)
            .IsUnique();

        // Foreign Key Configurations
        modelBuilder.Entity<HousekeepingTask>()
            .HasOne(h => h.Assignee)
            .WithMany()
            .HasForeignKey(h => h.AssignedTo)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<HotelManager>()
            .HasOne(hm => hm.Hotel)
            .WithMany()
            .HasForeignKey(hm => hm.HotelId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<HotelManager>()
            .HasOne(hm => hm.User)
            .WithMany()
            .HasForeignKey(hm => hm.UserId)
            .OnDelete(DeleteBehavior.Restrict);
            
        modelBuilder.Entity<Booking>()
            .HasOne(b => b.Hotel)
            .WithMany()
            .HasForeignKey(b => b.HotelId)
            .OnDelete(DeleteBehavior.Restrict);

        // Fix Cascade Delete Cycles for SQL Server
        modelBuilder.Entity<Room>()
            .HasOne(r => r.RoomType)
            .WithMany()
            .HasForeignKey(r => r.RoomTypeId)
            .OnDelete(DeleteBehavior.Restrict);
            
        modelBuilder.Entity<Room>()
            .HasOne(r => r.Hotel)
            .WithMany()
            .HasForeignKey(r => r.HotelId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<RoomType>()
            .HasOne(rt => rt.Hotel)
            .WithMany()
            .HasForeignKey(rt => rt.HotelId)
            .OnDelete(DeleteBehavior.Restrict);

        // Seed Roles
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, Name = "Admin" },
            new Role { Id = 2, Name = "Customer" },
            new Role { Id = 3, Name = "Manager" }
        );
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Edge Case 12: Append-only Audit logs
        var modifiedAuditLogs = ChangeTracker.Entries<AuditLog>()
            .Where(e => e.State == EntityState.Modified || e.State == EntityState.Deleted);

        if (modifiedAuditLogs.Any())
        {
            throw new InvalidOperationException("Audit logs are append-only. Modification or deletion is strictly prohibited.");
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
