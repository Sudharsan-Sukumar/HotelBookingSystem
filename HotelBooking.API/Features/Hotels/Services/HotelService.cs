using System.Linq;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Hotels.DTOs;
using HotelBooking.API.Features.Hotels.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HotelBooking.API.Features.Hotels.Services;

public class HotelService : IHotelService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private const string HotelCacheKey = "HotelsCacheKey";

    public HotelService(ApplicationDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<IEnumerable<HotelResponseDto>> GetAllHotelsAsync()
    {
        if (!_cache.TryGetValue(HotelCacheKey, out IEnumerable<HotelResponseDto>? hotels))
        {
            hotels = await _context.Hotels
                .Select(h => MapToDto(h))
                .ToListAsync();

            var cacheEntryOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromMinutes(10));

            _cache.Set(HotelCacheKey, hotels, cacheEntryOptions);
        }
        
        return hotels ?? Array.Empty<HotelResponseDto>();
    }

    public async Task<HotelResponseDto?> GetHotelByIdAsync(int id)
    {
        var hotel = await _context.Hotels.FindAsync(id);
        if (hotel == null) return null;
        return MapToDto(hotel);
    }

    public async Task<HotelResponseDto> CreateHotelAsync(HotelRequestDto request)
    {
        bool exists = await _context.Hotels
            .AnyAsync(h => h.Name.ToLower() == request.Name.ToLower() && h.City.ToLower() == request.City.ToLower());

        if (exists)
            throw new ArgumentException($"A hotel named '{request.Name}' already exists in '{request.City}'.");

        var existingIds = await _context.Hotels.Select(h => h.HotelCustomId).ToListAsync();
        int nextSequence = existingIds
            .Select(id => int.TryParse(id?.Split('-').LastOrDefault(), out var n) ? n : 0)
            .DefaultIfEmpty(0)
            .Max() + 1;
        string customId = $"HTL-{DateTime.UtcNow.Year}-{nextSequence:D4}";

        var hotel = new Hotel
        {
            HotelCustomId = customId,
            Name = request.Name,
            Description = request.Description,
            Location = request.Location,
            City = request.City,
            State = request.State,
            Country = request.Country,
            ZipCode = request.ZipCode,
            StarRating = request.StarRating,
            IsActive = request.IsActive
        };

        _context.Hotels.Add(hotel);
        await _context.SaveChangesAsync();
        _cache.Remove(HotelCacheKey);

        return await GetHotelByIdAsync(hotel.Id) ?? throw new Exception("Failed to create hotel.");
    }

    public async Task<HotelResponseDto?> UpdateHotelAsync(int id, HotelRequestDto hotelDto)
    {
        var hotel = await _context.Hotels.FindAsync(id);
        if (hotel == null) return null;

        // Edge Case 10: Manager edits hotel after admin deactivated it -> Editing blocked
        if (!hotel.IsActive && hotelDto.IsActive == hotel.IsActive)
            throw new InvalidOperationException("Cannot edit a deactivated hotel. Please activate it first.");

        // Edge Case 20: Admin approves a hotel, but manager hasn't set any pricing -> Block activation
        if (!hotel.IsActive && hotelDto.IsActive)
        {
            var hasRoomTypes = await _context.RoomTypes.AnyAsync(rt => rt.HotelId == id && rt.BasePrice > 0);
            if (!hasRoomTypes)
                throw new InvalidOperationException("Cannot activate a hotel without at least one room type with a valid price.");
        }

        // Edge Case 1 & 14: Optimistic Concurrency
        if (!string.IsNullOrEmpty(hotelDto.RowVersion))
        {
            _context.Entry(hotel).Property(h => h.RowVersion).OriginalValue = Convert.FromBase64String(hotelDto.RowVersion);
        }

        bool exists = await _context.Hotels
            .AnyAsync(h => h.Id != id && h.Name.ToLower() == hotelDto.Name.ToLower() && h.City.ToLower() == hotelDto.City.ToLower());

        if (exists)
            throw new ArgumentException($"Another hotel named '{hotelDto.Name}' already exists in '{hotelDto.City}'.");

        hotel.Name = hotelDto.Name;
        hotel.Description = hotelDto.Description;
        hotel.Location = hotelDto.Location;
        hotel.City = hotelDto.City;
        hotel.State = hotelDto.State;
        hotel.Country = hotelDto.Country;
        hotel.ZipCode = hotelDto.ZipCode;
        hotel.StarRating = hotelDto.StarRating;
        hotel.IsActive = hotelDto.IsActive;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new DbUpdateConcurrencyException("The hotel was modified by another user. Please refresh and try again.");
        }
        
        _cache.Remove(HotelCacheKey);

        return MapToDto(hotel);
    }

    public async Task<bool> DeleteHotelAsync(int id)
    {
        var hotel = await _context.Hotels.FindAsync(id);
        if (hotel == null) return false;

        // Edge Case 2 & 29: Soft Delete + Status Validation
        bool hasActiveBookings = await _context.Bookings
            .AnyAsync(b => b.HotelId == id && b.Status != "Cancelled" && b.CheckOutDate > DateTime.UtcNow);

        if (hasActiveBookings)
        {
            // Soft delete
            hotel.IsActive = false;
        }
        else
        {
            _context.Hotels.Remove(hotel);
        }

        await _context.SaveChangesAsync();
        _cache.Remove(HotelCacheKey);
        
        return true;
    }

    public async Task<IEnumerable<SearchHotelResultDto>> SearchHotelsAsync(SearchRequestDto request)
    {
        // Validation as per FR-9.2
        if (request.CheckInDate.Date < DateTime.UtcNow.Date)
            throw new ArgumentException("Check-in date cannot be in the past.");
        
        if (request.CheckOutDate.Date <= request.CheckInDate.Date)
            throw new ArgumentException("Check-out date must be after check-in.");
            
        if ((request.CheckInDate.Date - DateTime.UtcNow.Date).TotalDays > 365)
            throw new ArgumentException("Booking window cannot exceed 365 days.");

        // Fetch active hotels in city with their active room types that can fit the guests
        var hotels = await _context.Hotels
            .Where(h => h.IsActive && h.City.ToLower() == request.DestinationCity.ToLower())
            .Select(h => new
            {
                Hotel = h,
                RoomTypes = _context.RoomTypes
                    .Where(rt => rt.HotelId == h.Id && rt.IsActive && rt.Capacity >= request.Guests)
                    .Select(rt => new
                    {
                        RoomType = rt,
                        // Active bookings for this room type during requested dates
                        // Correctly sum NumberOfRooms from the top-level Bookings table
                        BookedRoomsCount = _context.Bookings
                            .Where(b => b.HotelId == h.Id && b.RoomTypeId == rt.Id && b.Status != "Cancelled" &&
                                        b.CheckInDate < request.CheckOutDate && 
                                        b.CheckOutDate > request.CheckInDate)
                            .Sum(b => (int?)b.NumberOfRooms) ?? 0
                    })
                    .ToList()
            })
            .ToListAsync();

        var results = new List<SearchHotelResultDto>();

        foreach (var h in hotels)
        {
            // Calculate actual availability
            var availableRoomTypes = h.RoomTypes
                .Select(rt => new
                {
                    rt.RoomType,
                    AvailableCount = rt.RoomType.TotalRooms - rt.BookedRoomsCount
                })
                .Where(rt => rt.AvailableCount > 0)
                .ToList();

            if (availableRoomTypes.Any())
            {
                var startingPrice = availableRoomTypes.Min(rt => rt.RoomType.BasePrice);
                
                results.Add(new SearchHotelResultDto
                {
                    HotelId = h.Hotel.Id,
                    HotelCustomId = h.Hotel.HotelCustomId,
                    Name = h.Hotel.Name,
                    City = h.Hotel.City,
                    StarRating = h.Hotel.StarRating,
                    ThumbnailUrl = h.Hotel.ThumbnailUrl,
                    StartingPrice = startingPrice,
                    IsAvailable = true
                });
            }
        }

        return results;
    }

    private static HotelResponseDto MapToDto(Hotel hotel)
    {
        return new HotelResponseDto
        {
            Id = hotel.Id,
            HotelCustomId = hotel.HotelCustomId,
            Name = hotel.Name,
            Description = hotel.Description,
            Location = hotel.Location,
            City = hotel.City,
            State = hotel.State,
            Country = hotel.Country,
            ZipCode = hotel.ZipCode,
            StarRating = hotel.StarRating,
            ThumbnailUrl = hotel.ThumbnailUrl,
            IsActive = hotel.IsActive,
            CreatedAt = hotel.CreatedAt,
            RowVersion = Convert.ToBase64String(hotel.RowVersion)
        };
    }

    public async Task<bool> AssignManagerAsync(int hotelId, int managerId)
    {
        var hotel = await _context.Hotels.FindAsync(hotelId);
        if (hotel == null) return false;

        var manager = await _context.Users.FirstOrDefaultAsync(u => u.Id == managerId && u.Role.Name == "Manager");
        if (manager == null) throw new ArgumentException("Invalid manager.");

        var alreadyAssigned = await _context.HotelManagers.AnyAsync(hm => hm.HotelId == hotelId && hm.UserId == managerId);
        if (alreadyAssigned) return true;

        // Edge Case 9: Admin assigns a manager to a hotel but they already manage max (2) branches
        var branchesManaged = await _context.HotelManagers.CountAsync(hm => hm.UserId == managerId);
        if (branchesManaged >= 2)
            throw new InvalidOperationException("This manager already manages the maximum allowed number of branches (2).");

        _context.HotelManagers.Add(new HotelManager { HotelId = hotelId, UserId = managerId });
        await _context.SaveChangesAsync();

        return true;
    }
}
