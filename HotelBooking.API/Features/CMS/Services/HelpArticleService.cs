using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.API.Features.CMS.Services;

public class HelpArticleService : IHelpArticleService
{
    private readonly ApplicationDbContext _context;

    public HelpArticleService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<HelpArticleResponseDto>> GetAllAsync(bool publishedOnly)
    {
        var query = _context.HelpArticles.AsQueryable();
        if (publishedOnly)
            query = query.Where(a => a.IsPublished);

        return await query
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => ToDto(a))
            .ToListAsync();
    }

    public async Task<HelpArticleResponseDto?> GetByIdAsync(int id)
    {
        var article = await _context.HelpArticles.FindAsync(id);
        return article == null ? null : ToDto(article);
    }

    public async Task<HelpArticleResponseDto> CreateAsync(HelpArticleRequestDto dto, int adminUserId)
    {
        var article = new HelpArticle
        {
            Title = dto.Title.Trim(),
            Category = dto.Category.Trim(),
            Content = dto.Content.Trim(),
            Tags = dto.Tags?.Trim(),
            IsPublished = dto.IsPublished,
            CreatedByUserId = adminUserId
        };

        _context.HelpArticles.Add(article);
        await _context.SaveChangesAsync();

        return ToDto(article);
    }

    public async Task<HelpArticleResponseDto> UpdateAsync(int id, HelpArticleRequestDto dto)
    {
        var article = await _context.HelpArticles.FindAsync(id);
        if (article == null)
            throw new ArgumentException("Help article not found.");

        article.Title = dto.Title.Trim();
        article.Category = dto.Category.Trim();
        article.Content = dto.Content.Trim();
        article.Tags = dto.Tags?.Trim();
        article.IsPublished = dto.IsPublished;
        article.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return ToDto(article);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var article = await _context.HelpArticles.FindAsync(id);
        if (article == null) return false;

        _context.HelpArticles.Remove(article);
        await _context.SaveChangesAsync();
        return true;
    }

    private static HelpArticleResponseDto ToDto(HelpArticle a) => new()
    {
        Id = a.Id,
        Title = a.Title,
        Category = a.Category,
        Content = a.Content,
        Tags = a.Tags,
        IsPublished = a.IsPublished,
        CreatedAt = a.CreatedAt,
        UpdatedAt = a.UpdatedAt
    };
}
