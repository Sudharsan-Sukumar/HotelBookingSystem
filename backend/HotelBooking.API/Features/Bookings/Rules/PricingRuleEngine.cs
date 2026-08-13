using System.IO;
using System.Text.Json;
using RulesEngine.Models;

namespace HotelBooking.API.Features.Bookings.Rules;

public class PricingRuleEngine : IPricingRuleService
{
    private readonly RulesEngine.RulesEngine _rulesEngine;

    public PricingRuleEngine()
    {
        var rulesJson = File.ReadAllText("Features/Bookings/Rules/pricing_rules.json");
        var workflows = JsonSerializer.Deserialize<Workflow[]>(rulesJson, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });
        _rulesEngine = new RulesEngine.RulesEngine(workflows, null);
    }

    public async Task<decimal> CalculateDynamicPriceAsync(decimal basePrice, bool isWeekend, bool isHoliday)
    {
        var inputs = new { IsWeekend = isWeekend, IsHoliday = isHoliday };
        var results = await _rulesEngine.ExecuteAllRulesAsync("CalculatePricing", inputs);

        decimal multiplier = 1.0m;
        foreach (var result in results)
        {
            if (result.IsSuccess)
            {
                multiplier *= decimal.Parse(result.Rule.SuccessEvent);
            }
        }

        return basePrice * multiplier;
    }
}
