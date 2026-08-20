using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using HotelBooking.API.Users.Models;
using HotelBooking.API.Authentication.Models;
using HotelBooking.API.Features.Hotels.Models;
using HotelBooking.API.Features.Rooms.Models;
using HotelBooking.API.Features.Bookings.Models;
using HotelBooking.API.Features.Payments.Models;
using HotelBooking.API.Features.CMS.Models;
using HotelBooking.API.Features.Reviews.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

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
    public DbSet<SecurityAuditLog> SecurityAuditLogs { get; set; } = null!;

    // Hotels & Rooms
    public DbSet<Hotel> Hotels { get; set; } = null!;
    public DbSet<RoomType> RoomTypes { get; set; } = null!;
    public DbSet<Room> Rooms { get; set; } = null!;
    public DbSet<RoomTypeImage> RoomTypeImages { get; set; } = null!;
    public DbSet<PricingOverride> PricingOverrides { get; set; } = null!;
    public DbSet<BlockedDate> BlockedDates { get; set; } = null!;
    public DbSet<Review> Reviews { get; set; } = null!;

    // Bookings & Payments
    public DbSet<Booking> Bookings { get; set; } = null!;
    public DbSet<HotelBooking.API.Features.Bookings.Models.BookingStatusHistory> BookingStatusHistory { get; set; } = null!;
    public DbSet<BookingRoom> BookingRooms { get; set; } = null!;
    public DbSet<Payment> Payments { get; set; } = null!;
    public DbSet<Refund> Refunds { get; set; } = null!;
    public DbSet<HotelBooking.API.Features.Payments.Models.RazorpayPayment> RazorpayPayments { get; set; } = null!;

    // Operations & CMS
    public DbSet<Notification> Notifications { get; set; } = null!;
    public DbSet<SystemSetting> SystemSettings { get; set; } = null!;
    public DbSet<SeasonalPolicy> SeasonalPolicies { get; set; } = null!;
    public DbSet<GeneralPolicy> GeneralPolicies { get; set; } = null!;
    public DbSet<Promotion> Promotions { get; set; } = null!;
    public DbSet<HeroContent> HeroContents { get; set; } = null!;
    public DbSet<AboutContent> AboutContents { get; set; } = null!;
    public DbSet<ContactContent> ContactContents { get; set; } = null!;
    public DbSet<HelpArticle> HelpArticles { get; set; } = null!;
    public DbSet<DatabaseBackup> DatabaseBackups { get; set; } = null!;
    public DbSet<HotelBooking.API.Common.Models.IdempotencyRecord> IdempotencyRecords { get; set; } = null!;
    public DbSet<HotelBooking.API.Common.Models.FailedEmail> FailedEmails { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // Ensure default schema
        modelBuilder.HasDefaultSchema("hotel");

        // Composite Keys for Join Tables
        modelBuilder.Entity<BookingRoom>()
            .HasKey(br => new { br.BookingId, br.RoomId });

        // Hotel.Images / Amenities / ManagerIds / Housekeeping are JSON columns replacing the
        // former HotelImages, Amenities+HotelAmenities, HotelManagers, and HousekeepingTasks tables.
        ConfigureJsonList<Hotel, HotelImageInfo>(modelBuilder, h => h.Images);
        ConfigureJsonList<Hotel, string>(modelBuilder, h => h.Amenities);
        ConfigureJsonList<Hotel, int>(modelBuilder, h => h.ManagerIds);
        ConfigureJsonList<Hotel, HousekeepingTaskInfo>(modelBuilder, h => h.Housekeeping);

        // User.SavedCards is a JSON column replacing the former standalone SavedCards table.
        ConfigureJsonList<User, SavedCardInfo>(modelBuilder, u => u.SavedCards);

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

        modelBuilder.Entity<Review>()
            .Property(r => r.RowVersion)
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

        // Search optimization: covers the availability lookup in HotelService.SearchHotelsAsync
        // (filter by hotel+roomtype+status, range-check the two date columns) without a table scan.
        modelBuilder.Entity<Booking>()
            .HasIndex(b => new { b.HotelId, b.RoomTypeId, b.Status, b.CheckInDate, b.CheckOutDate });

        modelBuilder.Entity<RoomType>()
            .HasIndex(rt => new { rt.HotelId, rt.IsActive });

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

        // Idempotency-Key Persistence - unique index enforces one stored response per key and backs the middleware's replay lookup.
        modelBuilder.Entity<HotelBooking.API.Common.Models.IdempotencyRecord>()
            .HasIndex(ir => ir.Key)
            .IsUnique();

        // Security audit log retrieval by recency (admin view) and by event type (e.g. count failed logins).
        modelBuilder.Entity<SecurityAuditLog>()
            .HasIndex(s => s.Timestamp);

        modelBuilder.Entity<SecurityAuditLog>()
            .HasIndex(s => new { s.EventType, s.Timestamp });

        // Foreign Key Configurations
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

    // Maps a List<TItem> property to a single JSON text column, with a value comparer so EF's
    // change tracker correctly detects in-place mutations (e.g. list.Add(...)) at SaveChanges time.
    private static void ConfigureJsonList<TEntity, TItem>(ModelBuilder modelBuilder, Expression<Func<TEntity, List<TItem>>> propertyExpression)
        where TEntity : class
    {
        modelBuilder.Entity<TEntity>().Property(propertyExpression)
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<TItem>>(v, (JsonSerializerOptions?)null) ?? new List<TItem>())
            .Metadata.SetValueComparer(new ValueComparer<List<TItem>>(
                (a, b) => JsonSerializer.Serialize(a, (JsonSerializerOptions?)null) == JsonSerializer.Serialize(b, (JsonSerializerOptions?)null),
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null).GetHashCode(),
                v => JsonSerializer.Deserialize<List<TItem>>(JsonSerializer.Serialize(v, (JsonSerializerOptions?)null), (JsonSerializerOptions?)null)!));
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
