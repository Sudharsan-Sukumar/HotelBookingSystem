using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace HotelBooking.API.Features.AI.Services;

/// <summary>One message in an OpenRouter (OpenAI-compatible) chat completion conversation.</summary>
public class OpenRouterMessage
{
    [JsonPropertyName("role")]
    public string Role { get; set; } = string.Empty; // "system" | "user" | "assistant" | "tool"

    [JsonPropertyName("content")]
    public string? Content { get; set; }

    [JsonPropertyName("tool_calls")]
    public List<OpenRouterToolCall>? ToolCalls { get; set; }

    [JsonPropertyName("tool_call_id")]
    public string? ToolCallId { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }
}

public class OpenRouterToolCall
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = "function";

    [JsonPropertyName("function")]
    public OpenRouterFunctionCall Function { get; set; } = new();
}

public class OpenRouterFunctionCall
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("arguments")]
    public string Arguments { get; set; } = "{}"; // JSON-encoded string, per OpenAI tool-calling spec
}

public class OpenRouterTool
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "function";

    [JsonPropertyName("function")]
    public OpenRouterFunctionSpec Function { get; set; } = new();
}

public class OpenRouterFunctionSpec
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;

    [JsonPropertyName("parameters")]
    public object Parameters { get; set; } = new { type = "object", properties = new { } };
}

public class OpenRouterChatRequest
{
    [JsonPropertyName("model")]
    public string Model { get; set; } = string.Empty;

    [JsonPropertyName("messages")]
    public List<OpenRouterMessage> Messages { get; set; } = new();

    [JsonPropertyName("tools")]
    public List<OpenRouterTool>? Tools { get; set; }

    [JsonPropertyName("temperature")]
    public double Temperature { get; set; } = 0.3;

    // Without an explicit cap, OpenAI-compatible providers default max_tokens very high (16k+),
    // which can exceed a free/low-balance OpenRouter account's remaining credit even for a short
    // reply. A chat answer never needs more than a few hundred tokens.
    [JsonPropertyName("max_tokens")]
    public int MaxTokens { get; set; } = 600;
}

public class OpenRouterChatResponse
{
    [JsonPropertyName("choices")]
    public List<OpenRouterChoice> Choices { get; set; } = new();
}

public class OpenRouterChoice
{
    [JsonPropertyName("message")]
    public OpenRouterMessage Message { get; set; } = new();

    [JsonPropertyName("finish_reason")]
    public string? FinishReason { get; set; }
}
