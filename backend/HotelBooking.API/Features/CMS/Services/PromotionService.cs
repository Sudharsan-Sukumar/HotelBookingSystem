using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using HotelBooking.API.Data;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Models;

namespace HotelBooking.API.Features.CMS.Services;

public class PromotionService : IPromotionService
{
    private readonly ApplicationDbContext _context;

    public PromotionService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Promotion>> GetAllPromotionsAsync(bool isAdmin)
    {
        if (isAdmin)
        {
            return await _context.Promotions.ToListAsync();
        }
        else
        {
            return await _context.Promotions
                .Where(p => p.IsActive && p.ValidUntil > DateTime.UtcNow)
                .ToListAsync();
        }
    }

    public async Task<Promotion?> GetPromotionByIdAsync(int id)
    {
        return await _context.Promotions.FindAsync(id);
    }

    public async Task<Promotion> CreatePromotionAsync(PromotionRequestDto dto)
    {
        // Guard Clause — rejects a new promotion whose CouponCode already exists before insert.
        var existing = await _context.Promotions.FirstOrDefaultAsync(p => p.CouponCode == dto.CouponCode);
        if (existing != null)
        {
            throw new ArgumentException("A promotion with this Coupon Code already exists.");
        }

        var promo = new Promotion
        {
            Title = dto.Title,
            DiscountDescription = dto.DiscountDescription,
            CouponCode = dto.CouponCode,
            ValidUntil = dto.ValidUntil,
            ImageUrl = dto.ImageUrl,
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _context.Promotions.Add(promo);
        await _context.SaveChangesAsync();
        return promo;
    }

    public async Task<bool> UpdatePromotionAsync(int id, PromotionRequestDto dto)
    {
        var promo = await _context.Promotions.FindAsync(id);
        if (promo == null) return false;

        // Guard Clause (excluding self) — re-checks coupon-code collision against other promotions before applying edits.
        var existing = await _context.Promotions.FirstOrDefaultAsync(p => p.CouponCode == dto.CouponCode && p.Id != id);
        if (existing != null)
        {
            throw new ArgumentException("A promotion with this Coupon Code already exists.");
        }

        promo.Title = dto.Title;
        promo.DiscountDescription = dto.DiscountDescription;
        promo.CouponCode = dto.CouponCode;
        promo.ValidUntil = dto.ValidUntil;
        promo.ImageUrl = dto.ImageUrl;
        promo.IsActive = dto.IsActive;

        _context.Promotions.Update(promo);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeletePromotionAsync(int id)
    {
        var promo = await _context.Promotions.FindAsync(id);
        if (promo == null) return false;

        _context.Promotions.Remove(promo);
        await _context.SaveChangesAsync();
        return true;
    }
}
