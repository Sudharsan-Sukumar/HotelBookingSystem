namespace HotelBooking.API.Features.Bookings.Rules;

public interface IPricingRuleService
{
    Task<decimal> CalculateDynamicPriceAsync(decimal basePrice, bool isWeekend, bool isHoliday);
}
