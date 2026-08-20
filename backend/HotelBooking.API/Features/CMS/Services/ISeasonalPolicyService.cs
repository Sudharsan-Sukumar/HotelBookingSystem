using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Features.CMS.DTOs;

namespace HotelBooking.API.Features.CMS.Services;

public interface ISeasonalPolicyService
{
    Task<IEnumerable<SeasonalPolicyDto>> GetAllAsync();
    Task<SeasonalPolicyDto> CreateAsync(SeasonalPolicyRequestDto request, int adminUserId);
    Task<SeasonalPolicyDto> UpdateAsync(int id, SeasonalPolicyRequestDto request, int adminUserId);
    Task DeleteAsync(int id, int adminUserId);

    // Resolves whichever active seasonal policy's [StartDate, EndDate] contains forDate; falls
    // back to the base SystemSettings-backed default (with its own UpdatedAt) when none match.
    // Shared by BookingService (at booking-creation snapshot time) and the public-facing
    // "effective policy" endpoint the customer policy modal reads from.
    Task<EffectiveCancellationPolicyDto> GetEffectivePolicyAsync(DateTime forDate);
}
