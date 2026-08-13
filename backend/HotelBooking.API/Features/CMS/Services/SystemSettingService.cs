using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using HotelBooking.API.Data;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Models;

namespace HotelBooking.API.Features.CMS.Services;

public class SystemSettingService : ISystemSettingService
{
    private readonly ApplicationDbContext _context;

    public SystemSettingService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<SystemSettingDto>> GetAllSettingsAsync()
    {
        return await _context.SystemSettings
            .Select(s => new SystemSettingDto { Key = s.Key, Value = s.Value })
            .ToListAsync();
    }

    public async Task<SystemSettingDto?> GetSettingByKeyAsync(string key)
    {
        var setting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == key);
        if (setting == null) return null;
        return new SystemSettingDto { Key = setting.Key, Value = setting.Value };
    }

    public async Task<bool> UpdateSettingAsync(string key, SystemSettingDto dto)
    {
        var setting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == key);
        if (setting == null) return false;

        setting.Value = dto.Value;
        setting.UpdatedAt = DateTime.UtcNow;

        _context.SystemSettings.Update(setting);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> CreateSettingAsync(SystemSettingDto dto)
    {
        var existing = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == dto.Key);
        if (existing != null) return false;

        _context.SystemSettings.Add(new SystemSetting 
        { 
            Key = dto.Key, 
            Value = dto.Value, 
            UpdatedAt = DateTime.UtcNow 
        });
        await _context.SaveChangesAsync();
        return true;
    }
}
