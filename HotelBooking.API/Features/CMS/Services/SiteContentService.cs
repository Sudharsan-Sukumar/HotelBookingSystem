using System;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Models;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.API.Features.CMS.Services;

public class SiteContentService : ISiteContentService
{
    private readonly ApplicationDbContext _context;

    public SiteContentService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<HeroContentResponseDto> GetHeroAsync()
    {
        var hero = await _context.HeroContents.FirstOrDefaultAsync();
        if (hero == null)
        {
            hero = new HeroContent
            {
                Heading = "Escape to Elegant Luxury",
                Subheading = "Discover premium suites across India.",
                BackgroundImageUrl = "assets/images/hero_bg.png"
            };
            _context.HeroContents.Add(hero);
            await _context.SaveChangesAsync();
        }

        return new HeroContentResponseDto
        {
            Id = hero.Id,
            Heading = hero.Heading,
            Subheading = hero.Subheading,
            BackgroundImageUrl = hero.BackgroundImageUrl,
            UpdatedAt = hero.UpdatedAt
        };
    }

    public async Task<HeroContentResponseDto> UpdateHeroAsync(HeroContentDto dto, int adminUserId)
    {
        var hero = await _context.HeroContents.FirstOrDefaultAsync();
        if (hero == null)
        {
            hero = new HeroContent();
            _context.HeroContents.Add(hero);
        }

        hero.Heading = dto.Heading.Trim();
        hero.Subheading = dto.Subheading.Trim();
        hero.BackgroundImageUrl = dto.BackgroundImageUrl.Trim();
        hero.UpdatedAt = DateTime.UtcNow;
        hero.UpdatedByUserId = adminUserId;

        await _context.SaveChangesAsync();

        return new HeroContentResponseDto
        {
            Id = hero.Id,
            Heading = hero.Heading,
            Subheading = hero.Subheading,
            BackgroundImageUrl = hero.BackgroundImageUrl,
            UpdatedAt = hero.UpdatedAt
        };
    }

    public async Task<AboutContentResponseDto> GetAboutAsync()
    {
        var about = await _context.AboutContents.FirstOrDefaultAsync();
        if (about == null)
        {
            about = new AboutContent
            {
                Heading = "Why Choose ElegantEnclave",
                Subheading = "We offer world-class amenities and services to make your stay unforgettable",
                History = "ElegantEnclave has been redefining hospitality across Salem, Coimbatore, and Chennai."
            };
            _context.AboutContents.Add(about);
            await _context.SaveChangesAsync();
        }

        return new AboutContentResponseDto
        {
            Id = about.Id,
            Heading = about.Heading,
            Subheading = about.Subheading,
            History = about.History,
            UpdatedAt = about.UpdatedAt
        };
    }

    public async Task<AboutContentResponseDto> UpdateAboutAsync(AboutContentDto dto, int adminUserId)
    {
        var about = await _context.AboutContents.FirstOrDefaultAsync();
        if (about == null)
        {
            about = new AboutContent();
            _context.AboutContents.Add(about);
        }

        about.Heading = dto.Heading.Trim();
        about.Subheading = dto.Subheading.Trim();
        about.History = dto.History.Trim();
        about.UpdatedAt = DateTime.UtcNow;
        about.UpdatedByUserId = adminUserId;

        await _context.SaveChangesAsync();

        return new AboutContentResponseDto
        {
            Id = about.Id,
            Heading = about.Heading,
            Subheading = about.Subheading,
            History = about.History,
            UpdatedAt = about.UpdatedAt
        };
    }

    public async Task<ContactContentResponseDto> GetContactAsync()
    {
        var contact = await _context.ContactContents.FirstOrDefaultAsync();
        if (contact == null)
        {
            contact = new ContactContent
            {
                Phone = "+91 98765 43210",
                Email = "support@elegantenclave.com",
                Address = "Chennai • Coimbatore • Salem"
            };
            _context.ContactContents.Add(contact);
            await _context.SaveChangesAsync();
        }

        return new ContactContentResponseDto
        {
            Id = contact.Id,
            Phone = contact.Phone,
            Email = contact.Email,
            Address = contact.Address,
            UpdatedAt = contact.UpdatedAt
        };
    }

    public async Task<ContactContentResponseDto> UpdateContactAsync(ContactContentDto dto, int adminUserId)
    {
        var contact = await _context.ContactContents.FirstOrDefaultAsync();
        if (contact == null)
        {
            contact = new ContactContent();
            _context.ContactContents.Add(contact);
        }

        contact.Phone = dto.Phone.Trim();
        contact.Email = dto.Email.Trim().ToLowerInvariant();
        contact.Address = dto.Address.Trim();
        contact.UpdatedAt = DateTime.UtcNow;
        contact.UpdatedByUserId = adminUserId;

        await _context.SaveChangesAsync();

        return new ContactContentResponseDto
        {
            Id = contact.Id,
            Phone = contact.Phone,
            Email = contact.Email,
            Address = contact.Address,
            UpdatedAt = contact.UpdatedAt
        };
    }
}
