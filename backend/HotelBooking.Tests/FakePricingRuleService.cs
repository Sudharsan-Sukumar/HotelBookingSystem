using System.Threading.Tasks;
using HotelBooking.API.Features.Bookings.Rules;

namespace HotelBooking.Tests;

internal class FakePricingRuleService : IPricingRuleService
{
    public Task<decimal> CalculateDynamicPriceAsync(decimal basePrice, bool isWeekend, bool isHoliday) => Task.FromResult(basePrice);
}
