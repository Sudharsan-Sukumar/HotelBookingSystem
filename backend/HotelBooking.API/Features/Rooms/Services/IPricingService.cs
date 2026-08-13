using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Features.Rooms.DTOs;
using HotelBooking.API.Features.Rooms.Models;

namespace HotelBooking.API.Features.Rooms.Services;

public interface IPricingService
{
    Task<PricingOverride> AddPricingOverrideAsync(PricingOverrideRequestDto request);
    Task<IEnumerable<PricingOverride>> GetPricingOverridesAsync(int roomTypeId);
    Task DeletePricingOverrideAsync(int id);
}
