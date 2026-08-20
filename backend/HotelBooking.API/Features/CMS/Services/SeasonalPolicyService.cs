using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using HotelBooking.API.Data;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Models;
using HotelBooking.API.Users.Services;

namespace HotelBooking.API.Features.CMS.Services;

public class SeasonalPolicyService : ISeasonalPolicyService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;
    private readonly ILogger<SeasonalPolicyService> _logger;

    public SeasonalPolicyService(ApplicationDbContext context, IAuditLogService auditLogService, ILogger<SeasonalPolicyService> logger)
    {
        _context = context;
        _auditLogService = auditLogService;
        _logger = logger;
    }

    private static SeasonalPolicyDto ToDto(SeasonalPolicy p) => new SeasonalPolicyDto
    {
        Id = p.Id,
        SeasonName = p.SeasonName,
        StartDate = p.StartDate,
        EndDate = p.EndDate,
        IsActive = p.IsActive,
        FullRefundHours = p.FullRefundHours,
        PartialRefundHours = p.PartialRefundHours,
        PartialRefundPercentage = p.PartialRefundPercentage,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt
    };

    public async Task<IEnumerable<SeasonalPolicyDto>> GetAllAsync()
    {
        var policies = await _context.SeasonalPolicies
            .OrderByDescending(p => p.StartDate)
            .ToListAsync();
        return policies.Select(ToDto);
    }

    public async Task<SeasonalPolicyDto> CreateAsync(SeasonalPolicyRequestDto request, int adminUserId)
    {
        if (request.EndDate < request.StartDate)
            throw new ArgumentException("Season end date cannot be before its start date.");

        var policy = new SeasonalPolicy
        {
            SeasonName = request.SeasonName,
            StartDate = request.StartDate.Date,
            EndDate = request.EndDate.Date,
            IsActive = request.IsActive,
            FullRefundHours = request.FullRefundHours,
            PartialRefundHours = request.PartialRefundHours,
            PartialRefundPercentage = request.PartialRefundPercentage,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.SeasonalPolicies.Add(policy);
        await _context.SaveChangesAsync();

        await _auditLogService.LogActionAsync(
            "SeasonalPolicy", policy.Id, "Create",
            $"Created seasonal policy '{policy.SeasonName}' ({policy.StartDate:yyyy-MM-dd} to {policy.EndDate:yyyy-MM-dd}).",
            adminUserId);

        return ToDto(policy);
    }

    public async Task<SeasonalPolicyDto> UpdateAsync(int id, SeasonalPolicyRequestDto request, int adminUserId)
    {
        var policy = await _context.SeasonalPolicies.FirstOrDefaultAsync(p => p.Id == id);
        if (policy == null)
            throw new KeyNotFoundException($"Seasonal policy with id {id} was not found.");

        if (request.EndDate < request.StartDate)
            throw new ArgumentException("Season end date cannot be before its start date.");

        policy.SeasonName = request.SeasonName;
        policy.StartDate = request.StartDate.Date;
        policy.EndDate = request.EndDate.Date;
        policy.IsActive = request.IsActive;
        policy.FullRefundHours = request.FullRefundHours;
        policy.PartialRefundHours = request.PartialRefundHours;
        policy.PartialRefundPercentage = request.PartialRefundPercentage;
        policy.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditLogService.LogActionAsync(
            "SeasonalPolicy", policy.Id, "Update",
            $"Updated seasonal policy '{policy.SeasonName}'.",
            adminUserId);

        return ToDto(policy);
    }

    public async Task DeleteAsync(int id, int adminUserId)
    {
        var policy = await _context.SeasonalPolicies.FirstOrDefaultAsync(p => p.Id == id);
        if (policy == null)
            throw new KeyNotFoundException($"Seasonal policy with id {id} was not found.");

        _context.SeasonalPolicies.Remove(policy);
        await _context.SaveChangesAsync();

        await _auditLogService.LogActionAsync(
            "SeasonalPolicy", id, "Delete",
            $"Deleted seasonal policy '{policy.SeasonName}'.",
            adminUserId);
    }

    public async Task<EffectiveCancellationPolicyDto> GetEffectivePolicyAsync(DateTime forDate)
    {
        var date = forDate.Date;
        var season = await _context.SeasonalPolicies
            .Where(p => p.IsActive && p.StartDate <= date && p.EndDate >= date)
            .OrderByDescending(p => p.UpdatedAt)
            .FirstOrDefaultAsync();

        if (season != null)
        {
            return new EffectiveCancellationPolicyDto
            {
                SeasonName = season.SeasonName,
                FullRefundHours = season.FullRefundHours,
                PartialRefundHours = season.PartialRefundHours,
                PartialRefundPercentage = season.PartialRefundPercentage,
                UpdatedAt = season.UpdatedAt
            };
        }

        var settings = await _context.SystemSettings
            .Where(s => s.Key == "CancellationPolicy.FullRefundHours" ||
                        s.Key == "CancellationPolicy.PartialRefundHours" ||
                        s.Key == "CancellationPolicy.PartialRefundPercentage")
            .ToListAsync();

        var byKey = settings.ToDictionary(s => s.Key, s => s);

        // Policy Versioning Silent-Default Warning - no seasonal override AND no SystemSettings configured for cancellation policy at all, so this falls all the way through to hardcoded defaults; log so an operator can notice unset policy config instead of it silently applying.
        if (settings.Count == 0)
        {
            _logger.LogWarning(
                "No seasonal policy or CancellationPolicy SystemSettings found for {ForDate:yyyy-MM-dd} — falling back to hardcoded default cancellation policy (48h full refund / 24h partial refund at 50%).",
                date);
        }

        double fullRefundHours = byKey.TryGetValue("CancellationPolicy.FullRefundHours", out var f) && double.TryParse(f.Value, out var fv) ? fv : 48;
        double partialRefundHours = byKey.TryGetValue("CancellationPolicy.PartialRefundHours", out var p) && double.TryParse(p.Value, out var pv) ? pv : 24;
        decimal partialRefundPercentage = byKey.TryGetValue("CancellationPolicy.PartialRefundPercentage", out var pct) && decimal.TryParse(pct.Value, out var pctv) ? pctv : 0.5m;
        DateTime? updatedAt = settings.Count > 0 ? settings.Max(s => s.UpdatedAt) : null;

        return new EffectiveCancellationPolicyDto
        {
            SeasonName = null,
            FullRefundHours = fullRefundHours,
            PartialRefundHours = partialRefundHours,
            PartialRefundPercentage = partialRefundPercentage,
            UpdatedAt = updatedAt
        };
    }
}
