using System.Threading.Tasks;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Services;
using Microsoft.EntityFrameworkCore;
using NUnit.Framework;

namespace HotelBooking.Tests.Features.CMS;

[TestFixture]
public class CMSTests
{
    private HotelBooking.API.Data.ApplicationDbContext _context = null!;
    private SiteContentService _service = null!;

    [SetUp]
    public void SetUp()
    {
        _context = TestDbContextFactory.Create();
        _service = new SiteContentService(_context);
    }

    [TearDown]
    public void TearDown() => _context.Dispose();

    [Test]
    public async Task GetHeroAsync_NoExistingRecord_CreatesAndReturnsDefault()
    {
        var result = await _service.GetHeroAsync();

        Assert.That(result, Is.Not.Null);
        Assert.That(result.Heading, Is.Not.Empty);
        Assert.That(await _context.HeroContents.CountAsync(), Is.EqualTo(1));
    }

    [Test]
    public async Task UpdateHeroAsync_PersistsChangesAndUpdatedBy()
    {
        var dto = new HeroContentDto
        {
            Heading = "New Heading",
            Subheading = "New Subheading",
            BackgroundImageUrl = "/images/new-bg.png"
        };

        var result = await _service.UpdateHeroAsync(dto, adminUserId: 99);

        Assert.That(result.Heading, Is.EqualTo("New Heading"));
        var hero = await _context.HeroContents.FirstAsync();
        Assert.That(hero.UpdatedByUserId, Is.EqualTo(99));
    }
}
