using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Features.CMS.DTOs;

namespace HotelBooking.API.Features.CMS.Services;

public interface ISystemSettingService
{
    Task<IEnumerable<SystemSettingDto>> GetAllSettingsAsync();
    Task<SystemSettingDto?> GetSettingByKeyAsync(string key);
    Task<bool> UpdateSettingAsync(string key, SystemSettingDto dto);
    Task<bool> CreateSettingAsync(SystemSettingDto dto);
}
