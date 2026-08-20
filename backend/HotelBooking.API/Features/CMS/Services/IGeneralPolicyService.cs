using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Features.CMS.DTOs;

namespace HotelBooking.API.Features.CMS.Services;

public interface IGeneralPolicyService
{
    Task<IEnumerable<GeneralPolicyResponseDto>> GetAllAsync();
    Task<GeneralPolicyResponseDto> GetByTypeAsync(string policyType);
    Task<GeneralPolicyResponseDto> UpdateAsync(string policyType, GeneralPolicyRequestDto request, int adminUserId);
}
