using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using Polly.CircuitBreaker;

namespace HotelBooking.API.Features.AI.Services;

// Mirrors RazorpayApiClient's pattern exactly: typed HttpClient, Polly retry/circuit-breaker
// (registered in Program.cs), Bearer auth built from server-side configuration only — the API key
// never reaches the Angular frontend or any response body.
public class OpenRouterClient : IOpenRouterClient
{
    private readonly HttpClient _httpClient;
    private readonly OpenRouterOptions _options;

    public OpenRouterClient(HttpClient httpClient, IOptions<OpenRouterOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;

        _httpClient.BaseAddress = new Uri("https://openrouter.ai/api/v1/");
        _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _options.ApiKey);
        _httpClient.DefaultRequestHeaders.Add("HTTP-Referer", "https://elegantenclave.local");
        _httpClient.DefaultRequestHeaders.Add("X-Title", "Elegant Enclave Assistant");
    }

    public async Task<OpenRouterChatResponse> GetChatCompletionAsync(OpenRouterChatRequest request)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new OpenRouterConfigurationException(
                "OpenRouter API key is not configured. Set it via the OpenRouter__ApiKey environment variable.");
        }

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.PostAsJsonAsync("chat/completions", request);
        }
        catch (BrokenCircuitException ex)
        {
            throw new OpenRouterUnavailableException("The AI assistant is temporarily unavailable after repeated failures. Please try again in a minute.", ex);
        }
        catch (HttpRequestException ex)
        {
            throw new OpenRouterUnavailableException("Could not reach the AI assistant. Please try again shortly.", ex);
        }
        catch (TaskCanceledException ex)
        {
            throw new OpenRouterUnavailableException("The AI assistant took too long to respond. Please try again.", ex);
        }

        if (response.StatusCode == HttpStatusCode.Unauthorized || response.StatusCode == HttpStatusCode.Forbidden)
        {
            throw new OpenRouterConfigurationException("OpenRouter rejected the configured API key.");
        }

        if (response.StatusCode == (HttpStatusCode)429)
        {
            throw new OpenRouterRateLimitedException("The AI assistant is receiving a lot of requests right now. Please try again in a moment.");
        }

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"OpenRouter request failed ({(int)response.StatusCode}): {body}");
        }

        var result = await response.Content.ReadFromJsonAsync<OpenRouterChatResponse>();
        return result ?? new OpenRouterChatResponse();
    }
}
