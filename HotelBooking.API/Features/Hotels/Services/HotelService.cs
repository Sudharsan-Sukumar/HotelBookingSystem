using System.Linq;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Hotels.DTOs;
using HotelBooking.API.Features.Hotels.Models;
using HotelBooking.API.Users.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace HotelBooking.API.Features.Hotels.Services;

public class HotelService : IHotelService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly IAuditLogService _auditLogService;
    private const string HotelCacheKey = "HotelsCacheKey";
    private static string HotelByIdCacheKey(int id) => $"Hotel_{id}";

    public HotelService(ApplicationDbContext context, IMemoryCache cache, IAuditLogService auditLogService)
    {
        _context = context;
        _cache = cache;
        _auditLogService = auditLogService;
    }

    public async Task<IEnumerable<HotelResponseDto>> GetAllHotelsAsync()
    {
        if (!_cache.TryGetValue(HotelCacheKey, out IEnumerable<HotelResponseDto>? hotels))
        {
            hotels = await _context.Hotels
                .AsNoTracking()
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
        var cacheKey = HotelByIdCacheKey(id);
        if (_cache.TryGetValue(cacheKey, out HotelResponseDto? cached))
            return cached;

        var hotel = await _context.Hotels.FindAsync(id);
        if (hotel == null) return null;

        var dto = MapToDto(hotel);
        _cache.Set(cacheKey, dto, new MemoryCacheEntryOptions().SetAbsoluteExpiration(TimeSpan.FromMinutes(10)));
        return dto;
    }

    public async Task<HotelResponseDto> CreateHotelAsync(HotelRequestDto request)
    {
        // Case-insensitive without ToLower(): SQL Server's default collation (…_CI_AS) already
        // compares '=' case-insensitively, so a plain equality check gets the same semantics while
        // staying sargable — LOWER()/ToLower() on both sides wraps the indexed column in a scalar
        // function, which defeats the (Name, City) index and forces a full scan.
        bool exists = await _context.Hotels
            .AnyAsync(h => h.Name == request.Name && h.City == request.City);

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

        await _auditLogService.LogActionAsync(
            "Hotel", hotel.Id, "Create",
            $"Hotel '{hotel.Name}' created in {hotel.City}.",
            null);

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

            // Admin Edge Case #10 (gap fix): the block above only fires when the request ALSO keeps
            // IsActive false, so a reactivation request used to be able to "smuggle in" arbitrary
            // other field edits in the same call. Reactivating must be its own, isolated action —
            // no other field may change in the same request that flips IsActive false -> true.
            bool onlyIsActiveChanged =
                hotel.Name == hotelDto.Name && hotel.Description == hotelDto.Description &&
                hotel.Location == hotelDto.Location && hotel.City == hotelDto.City &&
                hotel.State == hotelDto.State && hotel.Country == hotelDto.Country &&
                hotel.ZipCode == hotelDto.ZipCode && hotel.StarRating == hotelDto.StarRating;

            if (!onlyIsActiveChanged)
                throw new InvalidOperationException("Reactivating a hotel must be a standalone action — submit the reactivation first, then edit other fields separately.");
        }

        // Edge Case 1 & 14: Optimistic Concurrency
        if (!string.IsNullOrEmpty(hotelDto.RowVersion))
        {
            _context.Entry(hotel).Property(h => h.RowVersion).OriginalValue = Convert.FromBase64String(hotelDto.RowVersion);
        }

        bool exists = await _context.Hotels
            .AnyAsync(h => h.Id != id && h.Name == hotelDto.Name && h.City == hotelDto.City);

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
        _cache.Remove(HotelByIdCacheKey(id));

        await _auditLogService.LogActionAsync(
            "Hotel", hotel.Id, "Update",
            $"Hotel '{hotel.Name}' updated (city: {hotel.City}, starRating: {hotel.StarRating}, isActive: {hotel.IsActive}).",
            null);

        return MapToDto(hotel);
    }

    public async Task<bool> DeleteHotelAsync(int id)
    {
        var hotel = await _context.Hotels.FindAsync(id);
        if (hotel == null) return false;

        // Edge Case 2 & 29: Soft Delete + Status Validation
        bool hasActiveBookings = await _context.Bookings
            .AnyAsync(b => b.HotelId == id && b.Status != "Cancelled" && b.CheckOutDate > DateTime.UtcNow);

        bool softDeleted;
        if (hasActiveBookings)
        {
            // Soft delete
            hotel.IsActive = false;
            softDeleted = true;
        }
        else
        {
            _context.Hotels.Remove(hotel);
            softDeleted = false;
        }

        await _context.SaveChangesAsync();
        _cache.Remove(HotelCacheKey);
        _cache.Remove(HotelByIdCacheKey(id));

        if (softDeleted)
        {
            await _auditLogService.LogActionAsync(
                "Hotel", id, "StatusChange",
                $"Hotel '{hotel.Name}' soft-deleted (deactivated) due to active bookings.",
                null);
        }
        else
        {
            await _auditLogService.LogActionAsync(
                "Hotel", id, "Delete",
                $"Hotel '{hotel.Name}' permanently deleted.",
                null);
        }

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

        // FR-8.3: room types with a blocked date overlapping the requested range are unavailable
        var blockedRoomTypeIds = await _context.BlockedDates
            .Where(bd => bd.StartDate < request.CheckOutDate && bd.EndDate > request.CheckInDate)
            .Select(bd => bd.RoomTypeId)
            .Distinct()
            .ToListAsync();

        // Fetch active hotels in city with their active room types that can fit the guests.
        // AsNoTracking: this is a read-only projection, so skip EF's change-tracking overhead.
        // Plain '==' (not .ToLower()) keeps this sargable against the HasIndex(h => h.City) index —
        // see the comment in CreateHotelAsync's duplicate check for why ToLower() was removed.
        var hotels = await _context.Hotels
            .AsNoTracking()
            .Where(h => h.IsActive && h.City == request.DestinationCity)
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
                .Where(rt => rt.AvailableCount > 0 && !blockedRoomTypeIds.Contains(rt.RoomType.Id))
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

        // Pagination applied after availability filtering, since per-hotel availability depends
        // on an in-memory aggregation that can't be pushed down as a single SQL Skip/Take.
        return results
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize);
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

        if (hotel.ManagerIds.Contains(managerId)) return true;

        // FR-2.5: a hotel may have at most 2 active managers assigned at any time.
        if (hotel.ManagerIds.Count >= 2)
            throw new InvalidOperationException("Maximum manager limit (2) reached for this hotel.");

        hotel.ManagerIds.Add(managerId);
        await _context.SaveChangesAsync();
        _cache.Remove(HotelCacheKey);
        _cache.Remove(HotelByIdCacheKey(hotelId));

        await _auditLogService.LogActionAsync(
            "Hotel", hotelId, "AssignManager",
            $"Manager {managerId} assigned to hotel {hotelId}.",
            null);

        return true;
    }
}
