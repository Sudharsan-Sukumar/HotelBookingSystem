using System;
using System.Linq;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Hotels.Models;
using HotelBooking.API.Features.Rooms.Models;
using HotelBooking.API.Users.Models;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

namespace HotelBooking.API.Data;

public static class DataSeeder
{
    public static async Task SeedDataAsync(this IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        await context.Database.MigrateAsync();

        if (await context.Users.AnyAsync(u => u.Email == "admin@hbs.local")) return;

        // Users
        var admin = new User
        {
            UserCustomId = "ADM-2026-0001",
            FirstName = "Barath",
            LastName = "Admin",
            Email = "admin@hbs.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
            RoleId = 1,
            Status = "Active"
        };

        var salemManager = new User
        {
            UserCustomId = "MGR-2026-0001",
            FirstName = "Chandru",
            LastName = "Manager",
            Email = "salemmanager@hbs.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Manager@123"),
            RoleId = 3,
            Status = "Active"
        };

        var cbeManager = new User
        {
            UserCustomId = "MGR-2026-0002",
            FirstName = "Ram",
            LastName = "Manager",
            Email = "coimbatoremanager@hbs.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Manager@123"),
            RoleId = 3,
            Status = "Active"
        };

        var chennaiManager = new User
        {
            UserCustomId = "MGR-2026-0003",
            FirstName = "Ravi",
            LastName = "Manager",
            Email = "chennaiamager@hbs.local",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Manager@123"),
            RoleId = 3,
            Status = "Active"
        };

        context.Users.AddRange(admin, salemManager, cbeManager, chennaiManager);
        await context.SaveChangesAsync(); // Edge Case 12: Ensure this doesn't conflict. We are just Adding, not updating AuditLog.

        // Hotels
        var salemHotel = new Hotel
        {
            HotelCustomId = "HTL-2026-0001",
            Name = "Elegant Enclave Salem",
            Description = "A luxurious stay in Salem.",
            Location = "Central Salem",
            City = "Salem",
            State = "Tamil Nadu",
            Country = "India",
            ZipCode = "636001",
            StarRating = 5,
            IsActive = true
        };

        var cbeHotel = new Hotel
        {
            HotelCustomId = "HTL-2026-0002",
            Name = "Elegant Enclave Coimbatore",
            Description = "Premium hospitality in Manchester of South India.",
            Location = "RS Puram",
            City = "Coimbatore",
            State = "Tamil Nadu",
            Country = "India",
            ZipCode = "641002",
            StarRating = 5,
            IsActive = true
        };

        var chennaiHotel = new Hotel
        {
            HotelCustomId = "HTL-2026-0003",
            Name = "Elegant Enclave Chennai",
            Description = "Experience coastal luxury.",
            Location = "ECR",
            City = "Chennai",
            State = "Tamil Nadu",
            Country = "India",
            ZipCode = "600119",
            StarRating = 5,
            IsActive = true
        };

        context.Hotels.AddRange(salemHotel, cbeHotel, chennaiHotel);
        await context.SaveChangesAsync();

        // Assign Managers
        salemHotel.ManagerIds.Add(salemManager.Id);
        cbeHotel.ManagerIds.Add(cbeManager.Id);
        chennaiHotel.ManagerIds.Add(chennaiManager.Id);
        await context.SaveChangesAsync();

        // Room Types & Rooms
        var hotels = new[] { salemHotel, cbeHotel, chennaiHotel };
        var roomTypeNames = new[] { "Standard", "Deluxe", "Suite", "Executive Suite", "Presidential Suite" };
        var basePrices = new decimal[] { 2000, 3500, 5000, 7500, 15000 };
        var capacities = new[] { 2, 2, 3, 4, 4 };
        
        foreach (var hotel in hotels)
        {
            for (int i = 0; i < 5; i++)
            {
                var rt = new RoomType
                {
                    HotelId = hotel.Id,
                    Name = roomTypeNames[i],
                    Description = $"{roomTypeNames[i]} Room at {hotel.Name}",
                    BasePrice = basePrices[i],
                    Capacity = capacities[i],
                    TotalRooms = 10,
                    IsActive = true
                };
                context.RoomTypes.Add(rt);
                await context.SaveChangesAsync(); // Need Id for Rooms

                for (int j = 1; j <= 10; j++)
                {
                    context.Rooms.Add(new Room
                    {
                        HotelId = hotel.Id,
                        RoomTypeId = rt.Id,
                        RoomNumber = $"{rt.Name.Substring(0, 1).ToUpper()}-{j:D3}",
                        Floor = "1",
                        Status = "Available"
                    });
                }
            }
        }

        await context.SaveChangesAsync();
    }
}
