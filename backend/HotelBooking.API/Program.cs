using HotelBooking.API.Data;
using HotelBooking.API.Extensions;
using HotelBooking.API.Features.Hotels.Services;
using HotelBooking.API.Features.Bookings.Services;
using HotelBooking.API.Features.Payments.Services;
using HotelBooking.API.Features.Reports.Services;
using HotelBooking.API.Features.Rooms.Services;
using HotelBooking.API.Features.Reviews.Services;
using HotelBooking.API.Features.CMS.Services;
using HotelBooking.API.Users.Services;
using HotelBooking.API.Authentication.Services;
using HotelBooking.API.Authorization.Filters;
using HotelBooking.API.Authorization.Services;
using HotelBooking.API.Common.Middlewares;
using System.Security.Claims;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;


using System.Reflection;
using Swashbuckle.AspNetCore.Filters;
using Microsoft.OpenApi.Models;
using HotelBooking.API.Common.Filters;
using HotelBooking.API.Features.Bookings.Rules;
using HotelBooking.API.Common.Services;
using HotelBooking.API.Features.AI.Services;
using Polly;
using Polly.Extensions.Http;

using DotNetEnv;

Env.Load();

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();

// Technical/operational logs (ILogger<T> — exceptions, webhook failures, background job status, etc.)
// go to the console ONLY, never the database. This is a deliberate split: at scale, writing every
// technical log line to SQL Server doesn't hold up, so only genuinely business-relevant events use
// the database, via the separate AuditLogs table (see AuditLogService) — not ILogger at all. Explicit
// here rather than relying on ASP.NET Core's implicit default provider set, and ClearProviders()
// also drops the Debug/EventSource/EventLog providers that come with CreateBuilder by default, so
// console really is the only sink.
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

// Add caching
builder.Services.AddMemoryCache();

// Add services to the container.
builder.Services.AddControllers(options =>
{
    options.Filters.Add<ValidationFilterAttribute>();
    options.Filters.Add<ForcePasswordChangeFilter>();
});


builder.Services.Configure<Microsoft.AspNetCore.Mvc.ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(kvp => kvp.Value != null && kvp.Value.Errors.Count > 0)
            .SelectMany(kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage))
            .ToList();

        return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(
            HotelBooking.API.Common.Models.ApiResponse<object?>.ErrorResponse("Validation failed.", errors));
    };
});


builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendDev", policy =>
    {
        policy.WithOrigins("http://localhost:4200", "https://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Add DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// API Hardening: Rate Limiting (100 req/min per IP globally, plus stricter named policies
// for brute-force/abuse-sensitive endpoints applied via [EnableRateLimiting("...")] below).
builder.Services.AddRateLimiter(options =>
{
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 100,
                QueueLimit = 2,
                Window = TimeSpan.FromMinutes(1)
            }));

    // Login: 5 attempts/minute/IP — tight enough to slow credential stuffing, loose enough
    // that a user mistyping their password a few times isn't locked out.
    options.AddPolicy("auth-login", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 5,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(1)
            }));

    // Register/OTP/password-reset: 3 attempts/minute/IP — these trigger an email/SMTP send
    // or create a new account, so abuse here is both a cost and a spam vector.
    options.AddPolicy("auth-otp", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 3,
                QueueLimit = 0,
                Window = TimeSpan.FromMinutes(1)
            }));

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Add Application Services (from our Extensions)
builder.Services.AddApplicationServices();

// Heartbeat Health Check - exposes PaymentReconciliationService's last successful tick via ASP.NET Core's built-in health checks so an operator can detect a silently-wedged background loop before customers notice stuck payments.
builder.Services.AddHealthChecks()
    .AddCheck<HotelBooking.API.Common.Services.ReconciliationHealthCheck>("payment_reconciliation");

// Swagger / OpenAPI setup
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("Customer", new OpenApiInfo { Title = "The Elegant Enclave's Booking Application — Customer API", Version = "v1" });
    c.SwaggerDoc("Manager", new OpenApiInfo { Title = "The Elegant Enclave's Booking Application — Manager API", Version = "v1" });
    c.SwaggerDoc("Admin", new OpenApiInfo { Title = "The Elegant Enclave's Booking Application — Admin API", Version = "v1" });


    c.DocInclusionPredicate((docName, apiDesc) =>
    {
        var descriptor = apiDesc.ActionDescriptor as Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor;
        bool isSharedAuthEndpoint = descriptor?.ControllerName == "Auth" &&
            (descriptor.ActionName == nameof(HotelBooking.API.Authentication.Controllers.AuthController.Login) ||
             descriptor.ActionName == nameof(HotelBooking.API.Authentication.Controllers.AuthController.Logout));

        if (isSharedAuthEndpoint)
            return docName is "Customer" or "Manager" or "Admin";

        return apiDesc.GroupName == null || apiDesc.GroupName == docName;
    });

    // One named JWT Bearer scheme per actor (Admin / Customer / Hotel Manager — the three roles
    // seeded in the Roles table) instead of a single generic "Bearer" scheme shared by everyone.
    // Each shows up as its own clearly-labeled "Authorize" entry, scoped to its own Swagger
    // document by PerActorAuthorizeOperationFilter below — pasting a Customer token under
    // "AdminAuth" (or vice versa) still gets rejected server-side by the real [Authorize(Roles=...)]
    // checks, exactly as before; this only changes how Swagger presents the credential fields.
    c.AddSecurityDefinition("CustomerAuth", new OpenApiSecurityScheme
    {
        Description = "Customer JWT Bearer token. Paste the token returned by POST /api/auth/login for a Customer account.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityDefinition("ManagerAuth", new OpenApiSecurityScheme
    {
        Description = "Hotel Manager JWT Bearer token. Paste the token returned by POST /api/auth/login for a Manager account.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    c.AddSecurityDefinition("AdminAuth", new OpenApiSecurityScheme
    {
        Description = "Admin JWT Bearer token. Paste the token returned by POST /api/auth/login for an Admin account.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });

    // Access tokens are also delivered via a Secure/HttpOnly cookie (see AuthController); Swagger UI
    // runs same-origin, so that cookie is sent automatically on every "Try it out" call regardless
    // of whether an Authorize scheme below is set. The Authorize schemes remain useful for testing
    // as a *different* logged-in actor than whichever cookie is currently set in the browser tab,
    // since an explicit Authorization header always takes precedence over the cookie (see
    // Program.cs's JwtBearerEvents.OnMessageReceived).
    c.OperationFilter<HotelBooking.API.Features.Swagger.PerActorAuthorizeOperationFilter>();
    c.DocumentFilter<HotelBooking.API.Features.Swagger.PerActorSecuritySchemeDocumentFilter>();

    c.EnableAnnotations();
    c.ExampleFilters();

    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    c.IncludeXmlComments(xmlPath);

    // Force Auth controller to appear at the very top of the Swagger UI
    c.OrderActionsBy(apiDesc => 
    {
        var descriptor = apiDesc.ActionDescriptor as Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor;
        return descriptor?.ControllerName == "Auth" ? "0_Auth" : descriptor?.ControllerName;
    });
});
builder.Services.AddSwaggerExamplesFromAssemblyOf<Program>();


// Dependency Injection — wires interface-to-implementation bindings for all Admin/Manager/Customer services.
// Register Services
builder.Services.AddScoped<HotelBooking.API.Users.Services.IAdminUserService, HotelBooking.API.Users.Services.AdminUserService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IHotelService, HotelService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<HotelBooking.API.Features.Bookings.Services.IRoomAllocationService, HotelBooking.API.Features.Bookings.Services.RoomAllocationService>();
builder.Services.AddScoped<IRefundService, RefundService>();
builder.Services.AddScoped<IRoomTypeService, RoomTypeService>();

builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<HotelBooking.API.Users.Services.ISecurityAuditLogService, HotelBooking.API.Users.Services.SecurityAuditLogService>();

// Options Pattern — binds the "Razorpay" config section to a strongly-typed RazorpayOptions via IOptions<T>.
builder.Services.Configure<HotelBooking.API.Features.Payments.Services.RazorpayOptions>(
    builder.Configuration.GetSection(HotelBooking.API.Features.Payments.Services.RazorpayOptions.SectionName));
// Circuit Breaker + Retry (Polly) — retries transient Razorpay HTTP failures, then trips the circuit after repeated faults.
builder.Services.AddHttpClient<HotelBooking.API.Features.Payments.Services.IRazorpayApiClient,
    HotelBooking.API.Features.Payments.Services.RazorpayApiClient>()
    .SetHandlerLifetime(TimeSpan.FromMinutes(5))
    .AddPolicyHandler(HttpPolicyExtensions
        .HandleTransientHttpError()
        .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt))))
    .AddPolicyHandler(HttpPolicyExtensions
        .HandleTransientHttpError()
        .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30)))
    // Explicit HttpClient Timeout - without one, a Razorpay call that never times out at the socket level can hang indefinitely, sidestepping Polly's retry/circuit-breaker policies which only trigger on a completed faulted response.
    .ConfigureHttpClient(client => client.Timeout = TimeSpan.FromSeconds(15));
builder.Services.AddScoped<HotelBooking.API.Features.Payments.Services.IRazorpayPaymentService,
    HotelBooking.API.Features.Payments.Services.RazorpayPaymentService>();
// Heartbeat Pattern - singleton tracker records the reconciliation loop's last successful tick for the /health check below.
builder.Services.AddSingleton<HotelBooking.API.Common.Services.IReconciliationHealthTracker, HotelBooking.API.Common.Services.ReconciliationHealthTracker>();
builder.Services.AddHostedService<HotelBooking.API.Features.Payments.Services.PaymentReconciliationService>();
// Abandoned Payment-Session Cleanup - periodically auto-cancels bookings whose payment session expired and was never completed, closing the "booking lock never expires" gap.
builder.Services.AddHostedService<HotelBooking.API.Features.Bookings.Services.AbandonedBookingCleanupService>();
// Audit Log Retention - nightly purge of AuditLogs (365-day retention) and SecurityAuditLogs (90-day retention).
builder.Services.AddHostedService<HotelBooking.API.Users.Services.AuditLogRetentionService>();

builder.Services.Configure<OpenRouterOptions>(builder.Configuration.GetSection(OpenRouterOptions.SectionName));
builder.Services.AddHttpClient<IOpenRouterClient, OpenRouterClient>()
    .SetHandlerLifetime(TimeSpan.FromMinutes(5))
    .AddPolicyHandler(HttpPolicyExtensions
        .HandleTransientHttpError()
        .WaitAndRetryAsync(2, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt))))
    .AddPolicyHandler(HttpPolicyExtensions
        .HandleTransientHttpError()
        .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30)));
builder.Services.AddScoped<IAiChatService, AiChatService>();

builder.Services.AddSingleton<IPricingRuleService, PricingRuleEngine>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IPricingService, PricingService>();
builder.Services.AddScoped<IBlockedDateService, BlockedDateService>();
builder.Services.AddSingleton<HotelBooking.API.Common.Services.IFileUploadService, HotelBooking.API.Common.Services.FileUploadService>();
builder.Services.AddSingleton<HotelBooking.API.Common.Services.IImageCompressionService, HotelBooking.API.Common.Services.ImageCompressionService>();
builder.Services.AddScoped<IGalleryService, GalleryService>();
builder.Services.AddScoped<IReviewService, ReviewService>();

// Options Pattern — binds the "Smtp" section (User Secrets/env vars only — never appsettings.json) to a strongly-typed SmtpOptions via IOptions<T>.
builder.Services.Configure<HotelBooking.API.Common.Services.SmtpOptions>(
    builder.Configuration.GetSection(HotelBooking.API.Common.Services.SmtpOptions.SectionName));

// Producer-Consumer Pattern — controllers enqueue emails via IEmailQueue; BackgroundEmailService drains it on a hosted worker thread.
// Register Background Email Service
builder.Services.AddSingleton<BackgroundEmailQueue>();
builder.Services.AddSingleton<HotelBooking.API.Common.Services.IEmailQueue>(sp => sp.GetRequiredService<BackgroundEmailQueue>());
// Real SMTP delivery (Brevo) — was SimulatedEmailSender (Task.Delay only, no email ever sent).
builder.Services.AddSingleton<HotelBooking.API.Common.Services.IEmailSender, HotelBooking.API.Common.Services.SmtpEmailSender>();
builder.Services.AddHostedService<BackgroundEmailService>();

// Register Background Notification Service
builder.Services.AddSingleton<HotelBooking.API.Features.CMS.Services.BackgroundNotificationQueue>();
builder.Services.AddSingleton<HotelBooking.API.Features.CMS.Services.INotificationQueue>(sp => sp.GetRequiredService<HotelBooking.API.Features.CMS.Services.BackgroundNotificationQueue>());
builder.Services.AddHostedService<HotelBooking.API.Features.CMS.Services.BackgroundNotificationService>();

// Configure Webhook Policies
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<ISystemSettingService, SystemSettingService>();
builder.Services.AddScoped<ISeasonalPolicyService, SeasonalPolicyService>();
builder.Services.AddScoped<IGeneralPolicyService, GeneralPolicyService>();
builder.Services.AddScoped<IPromotionService, PromotionService>();
builder.Services.AddScoped<ISiteContentService, SiteContentService>();
builder.Services.AddScoped<IHelpArticleService, HelpArticleService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IDatabaseBackupService, DatabaseBackupService>();

// Phase 2 User Governance Services
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IApprovalWorkflowService, ApprovalWorkflowService>();
builder.Services.AddScoped<IUserBanService, UserBanService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IProfileService, ProfileService>();

// Phase 2 Rooms Services (Patch)
builder.Services.AddScoped<IRoomTypeService, RoomTypeService>();

builder.Services.AddScoped<ITokenAuthorizationService, TokenAuthorizationService>();

// JWT Authentication Setup
// Fail-Fast Startup Validation - refuses to boot with a silently-known hardcoded signing key; Jwt:Secret must be explicitly configured.
var secret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret configuration is required.");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "HotelBookingAPI",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "HotelBookingAPI",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret))
        };

        options.Events = new JwtBearerEvents
        {
            // Read the access token from the HttpOnly cookie when no Authorization header was sent
            // (native browser/cookie flow). If a header IS present (Swagger, Postman, the existing
            // localStorage-based frontend), the default JwtBearer header extraction still wins —
            // this only fills in the gap, it never overrides an explicit Authorization header.
            OnMessageReceived = context =>
            {
                if (string.IsNullOrEmpty(context.Token) &&
                    context.Request.Cookies.TryGetValue("access_token", out var cookieToken) &&
                    !string.IsNullOrEmpty(cookieToken))
                {
                    context.Token = cookieToken;
                }

                return Task.CompletedTask;
            },
            OnTokenValidated = async context =>
            {
                if (context.Principal == null) return;

                var authorizationService = context.HttpContext.RequestServices.GetRequiredService<ITokenAuthorizationService>();
                var denialReason = await authorizationService.GetDenialReasonAsync(context.Principal);
                if (denialReason != null)
                {
                    context.Fail(denialReason);
                }
            }
        };
    });

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    await scope.ServiceProvider.SeedDataAsync();
}

// Fail loudly at startup instead of surfacing a confusing 401/502 on the first real payment
// attempt — placeholder or missing Razorpay credentials are a config error, not a runtime one.
{
    var razorpayOptions = app.Services.GetRequiredService<Microsoft.Extensions.Options.IOptions<HotelBooking.API.Features.Payments.Services.RazorpayOptions>>().Value;
    var startupLogger = app.Services.GetRequiredService<ILogger<Program>>();
    bool looksLikePlaceholder(string? value, string placeholder) =>
        string.IsNullOrWhiteSpace(value) || value.Equals(placeholder, StringComparison.OrdinalIgnoreCase);

    if (looksLikePlaceholder(razorpayOptions.KeyId, "rzp_test_YourKeyIdHere") ||
        looksLikePlaceholder(razorpayOptions.KeySecret, "YourKeySecretHere") ||
        looksLikePlaceholder(razorpayOptions.WebhookSecret, "YourWebhookSecretHere"))
    {
        startupLogger.LogWarning(
            "Razorpay credentials are missing or still set to placeholder values in .env. " +
            "Every Razorpay order/payment-link call will fail with 401 until Razorpay:KeyId, " +
            "Razorpay:KeySecret, and Razorpay:WebhookSecret are set to real values from the Razorpay Dashboard.");
    }
    else
    {
        var masked = razorpayOptions.KeyId.Length > 12 ? razorpayOptions.KeyId[..12] + "..." : razorpayOptions.KeyId;
        startupLogger.LogInformation("Razorpay configured with KeyId {MaskedKeyId}.", masked);
    }
}

// Same "fail loudly at startup" idea as the Razorpay check above — a missing SMTP login means
// every OTP/verification/reset email will silently never arrive otherwise.
{
    var smtpOptions = app.Services.GetRequiredService<Microsoft.Extensions.Options.IOptions<HotelBooking.API.Common.Services.SmtpOptions>>().Value;
    var smtpLogger = app.Services.GetRequiredService<ILogger<Program>>();

    if (string.IsNullOrWhiteSpace(smtpOptions.Host) || string.IsNullOrWhiteSpace(smtpOptions.Login) || string.IsNullOrWhiteSpace(smtpOptions.Password))
    {
        smtpLogger.LogWarning(
            "SMTP is not configured (Smtp:Host/Smtp:Login/Smtp:Password missing). " +
            "OTP/verification/reset emails will fail to send until these are set via User Secrets or environment variables.");
    }
    else
    {
        smtpLogger.LogInformation("SMTP configured: {Host}:{Port}, login {Login}.", smtpOptions.Host, smtpOptions.Port, smtpOptions.Login);
    }
}

// Middleware Pattern — request pipeline where each component (exception handling, idempotency) wraps the next.
// Configure the HTTP request pipeline.
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseMiddleware<IdempotencyMiddleware>();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/Customer/swagger.json", "Customer API");
    c.SwaggerEndpoint("/swagger/Manager/swagger.json", "Manager API");
    c.SwaggerEndpoint("/swagger/Admin/swagger.json", "Admin API");
    c.DocumentTitle = "The Elegant Enclave's Booking Application";
});

// Local dev note: always run this API with `dotnet run --launch-profile http` (the default
// profile) alongside the Angular dev server. The Angular environment.ts points at the plain
// http://localhost:5031 origin; if this API is started with `--launch-profile https` instead,
// this redirect sends every http:// request (including CORS preflight OPTIONS calls) to https://,
// and browsers refuse to follow a redirect on a preflight request — every API call then fails
// with ERR_INVALID_REDIRECT/CORS errors that look like a backend outage but are just this profile
// mismatch. See launchSettings.json's "http" profile.
app.UseHttpsRedirection();


app.UseStaticFiles();

app.UseCors("FrontendDev");

app.UseRateLimiter(); // API Hardening

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
