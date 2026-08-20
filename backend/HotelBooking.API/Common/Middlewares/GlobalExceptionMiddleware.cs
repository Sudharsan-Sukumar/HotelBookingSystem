using System.Net;
using System.Text.Json;
using HotelBooking.API.Common.Models;

namespace HotelBooking.API.Common.Middlewares;

// QA Defect (Medium): this was serializing with System.Text.Json's default naming policy
// (PascalCase — "Success","Message","Data","Errors"), while every controller-returned ApiResponse
// goes through ASP.NET Core's own JSON formatter, which (via AddControllers' Web defaults) uses
// camelCase. Any error that reached this middleware — including a plain uncaught
// InvalidOperationException/ArgumentException from a service, not just genuine 500s — came back in
// a DIFFERENT casing than every other response, breaking case-sensitive client deserialization.

// Middleware Pattern — wraps the rest of the request pipeline to catch unhandled exceptions in one place.
public class GlobalExceptionMiddleware
{
    private static readonly JsonSerializerOptions CamelCaseOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred.");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var statusCode = exception switch
        {
            InvalidOperationException => (int)HttpStatusCode.BadRequest,
            KeyNotFoundException => (int)HttpStatusCode.NotFound,
            UnauthorizedAccessException => (int)HttpStatusCode.Unauthorized,
            _ => (int)HttpStatusCode.InternalServerError
        };

        context.Response.StatusCode = statusCode;

        var response = ApiResponse<object?>.ErrorResponse(
            "An error occurred while processing your request.",
            new List<string> { exception.Message }); // In production, we might want to hide internal errors

        var result = JsonSerializer.Serialize(response, CamelCaseOptions);
        return context.Response.WriteAsync(result);
    }
}
