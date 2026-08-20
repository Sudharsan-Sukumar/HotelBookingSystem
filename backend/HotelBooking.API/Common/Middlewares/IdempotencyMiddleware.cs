using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Concurrent;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using HotelBooking.API.Common.Attributes;
using HotelBooking.API.Common.Models;
using HotelBooking.API.Data;
using Microsoft.AspNetCore.Http.Features;

namespace HotelBooking.API.Common.Middlewares;

public class IdempotencyMiddleware
{
    private readonly RequestDelegate _next;
    private const string IdempotencyHeader = "Idempotency-Key";

    // Keyed locks, one SemaphoreSlim per in-flight Idempotency-Key, so a second concurrent request
    // with the same key waits for the first to finish instead of both racing past the DB-lookup miss
    // check. Still process-local — correct for same-instance concurrency, which is all it was ever
    // relied on for; the cross-instance/restart-survival guarantee now comes from the DB record below.
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> _keyLocks = new();

    public IdempotencyMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ApplicationDbContext dbContext)
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

        // Idempotency-Key Persistence — DB-backed replay check (instead of IMemoryCache) so a
        // previously-completed request for this key is still recognized after an app restart or from
        // a different instance, not just within the process that originally handled it.
        var existing = await dbContext.IdempotencyRecords.AsNoTracking().FirstOrDefaultAsync(r => r.Key == cacheKey);
        if (existing != null)
        {
            await WriteStoredResponseAsync(context, existing);
            return;
        }

        // Race Condition Fix (Keyed Lock) - serializes concurrent requests sharing the same Idempotency-Key so only one actually executes the handler; the rest wait and then reuse the stored response instead of both processing the payment twice.
        var keyLock = _keyLocks.GetOrAdd(cacheKey, _ => new SemaphoreSlim(1, 1));
        await keyLock.WaitAsync();
        try
        {
            // Re-check now that we hold the lock — the request that held it first may have
            // already persisted its record while we were waiting.
            existing = await dbContext.IdempotencyRecords.AsNoTracking().FirstOrDefaultAsync(r => r.Key == cacheKey);
            if (existing != null)
            {
                await WriteStoredResponseAsync(context, existing);
                return;
            }

            // Intercept response body
            var originalBodyStream = context.Response.Body;
            using var responseBody = new MemoryStream();
            context.Response.Body = responseBody;

            IdempotencyRecord? winningRecord = null;
            try
            {
                await _next(context);

                if (context.Response.StatusCode >= 200 && context.Response.StatusCode < 300)
                {
                    context.Response.Body.Seek(0, SeekOrigin.Begin);
                    var responseText = await new StreamReader(context.Response.Body).ReadToEndAsync();

                    winningRecord = await PersistResponseAsync(dbContext, cacheKey, context.Response.StatusCode, responseText);
                }

                if (winningRecord == null)
                {
                    context.Response.Body.Seek(0, SeekOrigin.Begin);
                    await responseBody.CopyToAsync(originalBodyStream);
                }
            }
            finally
            {
                context.Response.Body = originalBodyStream;
            }

            if (winningRecord != null)
            {
                // Lost the unique-index race to another instance — serve exactly what that
                // instance stored instead of the response we just computed locally, so both
                // callers observe the same idempotent result.
                await WriteStoredResponseAsync(context, winningRecord);
            }
        }
        finally
        {
            keyLock.Release();
            // Clean up the semaphore entry once nobody else is waiting on it, to avoid unbounded growth.
            if (keyLock.CurrentCount == 1)
            {
                _keyLocks.TryRemove(cacheKey, out _);
            }
        }
    }

    private static async Task WriteStoredResponseAsync(HttpContext context, IdempotencyRecord record)
    {
        context.Response.StatusCode = record.ResponseStatusCode;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsync(record.ResponseBody ?? string.Empty);
    }

    // Returns null on a normal insert (the just-computed response is the one to serve), or the
    // other instance's already-stored record if a unique-constraint conflict on Key occurred.
    private static async Task<IdempotencyRecord?> PersistResponseAsync(ApplicationDbContext dbContext, string key, int statusCode, string responseBody)
    {
        try
        {
            dbContext.IdempotencyRecords.Add(new IdempotencyRecord
            {
                Key = key,
                ResponseStatusCode = statusCode,
                ResponseBody = responseBody
            });
            await dbContext.SaveChangesAsync();
            return null;
        }
        catch (DbUpdateException)
        {
            // True multi-instance race: another instance already inserted a record for this same key
            // between our lookup and our insert (unique index violation). Don't error out — re-query
            // and serve whatever the other instance already stored, which is exactly the idempotent
            // contract this middleware exists to provide.
            dbContext.ChangeTracker.Clear();
            return await dbContext.IdempotencyRecords.AsNoTracking().FirstOrDefaultAsync(r => r.Key == key);
        }
    }
}
