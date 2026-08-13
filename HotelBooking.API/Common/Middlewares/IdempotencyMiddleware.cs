using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using HotelBooking.API.Common.Attributes;
using Microsoft.AspNetCore.Http.Features;

namespace HotelBooking.API.Common.Middlewares;

public class IdempotencyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;
    private const string IdempotencyHeader = "Idempotency-Key";

    public IdempotencyMiddleware(RequestDelegate next, IMemoryCache cache)
    {
        _next = next;
        _cache = cache;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var endpoint = context.Features.Get<IEndpointFeature>()?.Endpoint;
        var isIdempotent = endpoint?.Metadata.GetMetadata<IdempotentAttribute>() != null;

        if (!isIdempotent || context.Request.Method != HttpMethods.Post)
        {
            await _next(context);
            return;
        }

        if (!context.Request.Headers.TryGetValue(IdempotencyHeader, out var idempotencyKey) || string.IsNullOrWhiteSpace(idempotencyKey))
        {
            // If the client doesn't provide a key, we just continue normally.
            // Alternatively, we could reject the request here if strict idempotency is required.
            await _next(context);
            return;
        }

        var cacheKey = $"Idempotency_{idempotencyKey}";

        if (_cache.TryGetValue(cacheKey, out string? cachedResponse))
        {
            context.Response.StatusCode = 200; // Return OK for cached response
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(cachedResponse ?? string.Empty);
            return;
        }

        // Intercept response body
        var originalBodyStream = context.Response.Body;
        using var responseBody = new MemoryStream();
        context.Response.Body = responseBody;

        try
        {
            await _next(context);

            if (context.Response.StatusCode >= 200 && context.Response.StatusCode < 300)
            {
                context.Response.Body.Seek(0, SeekOrigin.Begin);
                var responseText = await new StreamReader(context.Response.Body).ReadToEndAsync();

                var cacheOptions = new MemoryCacheEntryOptions().SetAbsoluteExpiration(TimeSpan.FromHours(24));
                _cache.Set(cacheKey, responseText, cacheOptions);
            }

            context.Response.Body.Seek(0, SeekOrigin.Begin);
            await responseBody.CopyToAsync(originalBodyStream);
        }
        finally
        {
            context.Response.Body = originalBodyStream;
        }
    }
}
