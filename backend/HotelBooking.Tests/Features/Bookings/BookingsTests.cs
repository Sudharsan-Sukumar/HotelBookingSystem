using HotelBooking.API.Features.Bookings.Rules;
using NUnit.Framework;

namespace HotelBooking.Tests.Features.Bookings;

[TestFixture]
public class BookingsTests
{
    private PricingRuleEngine _engine = null!;

    [SetUp]
    public void SetUp()
    {
        _engine = new PricingRuleEngine();
    }

    [Test]
    public async Task CalculateDynamicPriceAsync_NormalWeekday_ReturnsBasePriceUnchanged()
    {
        var result = await _engine.CalculateDynamicPriceAsync(1000m, isWeekend: false, isHoliday: false);

        Assert.That(result, Is.EqualTo(1000m));
    }

    [Test]
    public async Task CalculateDynamicPriceAsync_Weekend_AppliesSurgeMultiplier()
    {
        var result = await _engine.CalculateDynamicPriceAsync(1000m, isWeekend: true, isHoliday: false);

        Assert.That(result, Is.EqualTo(1200m));
    }

    [Test]
    public async Task CalculateDynamicPriceAsync_Holiday_AppliesDiscountMultiplier()
    {
        var result = await _engine.CalculateDynamicPriceAsync(1000m, isWeekend: false, isHoliday: true);

        Assert.That(result, Is.EqualTo(900m));
    }

    [Test]
    public async Task CalculateDynamicPriceAsync_WeekendAndHoliday_AppliesBothMultipliers()
    {
        var result = await _engine.CalculateDynamicPriceAsync(1000m, isWeekend: true, isHoliday: true);

        // 1000 * 1.2 * 0.9
        Assert.That(result, Is.EqualTo(1080m));
    }
}
