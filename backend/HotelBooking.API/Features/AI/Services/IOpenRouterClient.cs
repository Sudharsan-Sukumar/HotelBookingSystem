using System.Threading.Tasks;

namespace HotelBooking.API.Features.AI.Services;

public interface IOpenRouterClient
{
    Task<OpenRouterChatResponse> GetChatCompletionAsync(OpenRouterChatRequest request);
}

// Thrown for network failure or after the circuit breaker trips — callers should show a friendly
// "assistant is temporarily unavailable" message instead of a raw error.
public class OpenRouterUnavailableException : System.Exception
{
    public OpenRouterUnavailableException(string message, System.Exception? inner = null) : base(message, inner) { }
}

// Thrown specifically on 401/403 (bad/missing API key) — a configuration problem, not transient.
public class OpenRouterConfigurationException : System.Exception
{
    public OpenRouterConfigurationException(string message) : base(message) { }
}

// Thrown on 429 (rate limited) so the caller can show a specific "please wait" message.
public class OpenRouterRateLimitedException : System.Exception
{
    public OpenRouterRateLimitedException(string message) : base(message) { }
}
