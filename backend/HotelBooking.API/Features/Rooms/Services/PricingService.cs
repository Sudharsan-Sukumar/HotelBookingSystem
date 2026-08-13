using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Rooms.DTOs;
using HotelBooking.API.Features.Rooms.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.API.Features.Rooms.Services;

public class PricingService : IPricingService
{
    private readonly ApplicationDbContext _context;

    public PricingService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PricingOverride> AddPricingOverrideAsync(PricingOverrideRequestDto request)
    {
        var roomType = await _context.RoomTypes.FindAsync(request.RoomTypeId);
        if (roomType == null)
            throw new ArgumentException("Room type not found.");

        // Edge Case 4: Manager sets pricing override to 0 or negative
        if (request.Price <= 0)
            throw new InvalidOperationException("Pricing override must be greater than zero.");

        // Check for overlap
        bool hasOverlap = await _context.PricingOverrides
            .AnyAsync(po => po.RoomTypeId == request.RoomTypeId && 
                            po.IsActive &&
                            po.StartDate < request.EndDate && po.EndDate > request.StartDate);

        if (hasOverlap)
            throw new InvalidOperationException("Pricing override overlaps with an existing override for this room type.");

        var pricingOverride = new PricingOverride
        {
            RoomTypeId = request.RoomTypeId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Price = request.Price,
            IsActive = true
        };

        _context.PricingOverrides.Add(pricingOverride);
        await _context.SaveChangesAsync();

        return pricingOverride;
    }

    public async Task<IEnumerable<PricingOverride>> GetPricingOverridesAsync(int roomTypeId)
    {
        return await _context.PricingOverrides
            .Where(po => po.RoomTypeId == roomTypeId && po.IsActive)
            .OrderBy(po => po.StartDate)
            .ToListAsync();
    }

    public async Task DeletePricingOverrideAsync(int id)
    {
        var overrideRecord = await _context.PricingOverrides.FindAsync(id);
        if (overrideRecord != null)
        {
            overrideRecord.IsActive = false;
            await _context.SaveChangesAsync();
        }
    }
}
