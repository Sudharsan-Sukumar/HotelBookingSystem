namespace HotelBooking.API.Features.AI.Services;

// Bound from configuration section "OpenRouter". ApiKey must come from an environment variable
// (OpenRouter__ApiKey) or a user-secrets/appsettings.Development.json override — appsettings.json
// itself only ever holds an empty placeholder, and the key is never referenced from the frontend.
public class OpenRouterOptions
{
    public const string SectionName = "OpenRouter";

    public string ApiKey { get; set; } = string.Empty;
    public string Model { get; set; } = "openai/gpt-4o";
}
