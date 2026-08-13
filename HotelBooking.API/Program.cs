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

// QA Defect (Medium): [ApiController]'s built-in automatic model-validation response runs BEFORE
// any action filter gets a chance — including ValidationFilterAttribute above — so every
// [Required]/[RegularExpression]/IValidatableObject failure was short-circuited straight to ASP.NET
// Core's raw ProblemDetails shape ({type,title,status,errors}), never reaching the ApiResponse<T>
// envelope every other endpoint in this API uses. This overrides that default factory so model-state
// failures come back in the SAME ApiResponse<object?> shape as every hand-written BadRequest(...)
// elsewhere, aggregating field errors the same way ValidationFilterAttribute already does.
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

// Dev-only CORS so the standalone (localStorage-based) Phase 2 frontend can call
// the Razorpay order/verify endpoints. Tighten to specific origins before production.
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendDev", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Add DbContext
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// API Hardening: Rate Limiting (100 req/min per IP)
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
            
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Add Application Services (from our Extensions)
builder.Services.AddApplicationServices();

// Swagger / OpenAPI setup
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("Customer", new OpenApiInfo { Title = "The Elegant Enclave's Booking Application — Customer API", Version = "v1" });
    c.SwaggerDoc("Manager", new OpenApiInfo { Title = "The Elegant Enclave's Booking Application — Manager API", Version = "v1" });
    c.SwaggerDoc("Admin", new OpenApiInfo { Title = "The Elegant Enclave's Booking Application — Admin API", Version = "v1" });

    // AuthController is grouped under "Customer" by default (its class-level GroupName), which
    // meant Admin/Manager users had to jump to the Customer doc just to log in, then switch docs
    // and paste the token by hand. Instead of duplicating the login/logout implementation per
    // role, keep the single AuthController and just make its Login/Logout actions visible inside
    // every role's own document too — same underlying endpoint, reused as-is, just discoverable
    // from wherever the user actually is.
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


// Register Services
builder.Services.AddScoped<HotelBooking.API.Users.Services.IAdminUserService, HotelBooking.API.Users.Services.AdminUserService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IHotelService, HotelService>();
builder.Services.AddScoped<IBookingService, BookingService>();
builder.Services.AddScoped<HotelBooking.API.Features.Bookings.Services.IRoomAllocationService, HotelBooking.API.Features.Bookings.Services.RoomAllocationService>();
builder.Services.AddScoped<IRefundService, RefundService>();
builder.Services.AddScoped<IRoomTypeService, RoomTypeService>();

builder.Services.AddScoped<IAuditLogService, AuditLogService>();

builder.Services.Configure<HotelBooking.API.Features.Payments.Services.RazorpayOptions>(
    builder.Configuration.GetSection(HotelBooking.API.Features.Payments.Services.RazorpayOptions.SectionName));
builder.Services.AddHttpClient<HotelBooking.API.Features.Payments.Services.IRazorpayApiClient,
    HotelBooking.API.Features.Payments.Services.RazorpayApiClient>()
    .SetHandlerLifetime(TimeSpan.FromMinutes(5))
    .AddPolicyHandler(HttpPolicyExtensions
        .HandleTransientHttpError()
        .WaitAndRetryAsync(3, retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt))))
    .AddPolicyHandler(HttpPolicyExtensions
        .HandleTransientHttpError()
        .CircuitBreakerAsync(5, TimeSpan.FromSeconds(30)));
builder.Services.AddScoped<HotelBooking.API.Features.Payments.Services.IRazorpayPaymentService,
    HotelBooking.API.Features.Payments.Services.RazorpayPaymentService>();
builder.Services.AddHostedService<HotelBooking.API.Features.Payments.Services.PaymentReconciliationService>();

builder.Services.AddSingleton<IPricingRuleService, PricingRuleEngine>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IPricingService, PricingService>();
builder.Services.AddScoped<IBlockedDateService, BlockedDateService>();
builder.Services.AddSingleton<HotelBooking.API.Common.Services.IFileUploadService, HotelBooking.API.Common.Services.FileUploadService>();
builder.Services.AddSingleton<HotelBooking.API.Common.Services.IImageCompressionService, HotelBooking.API.Common.Services.ImageCompressionService>();
builder.Services.AddScoped<IGalleryService, GalleryService>();
builder.Services.AddScoped<IReviewService, ReviewService>();

// Register Background Email Service
builder.Services.AddSingleton<BackgroundEmailQueue>();
builder.Services.AddSingleton<HotelBooking.API.Common.Services.IEmailQueue>(sp => sp.GetRequiredService<BackgroundEmailQueue>());
builder.Services.AddSingleton<HotelBooking.API.Common.Services.IEmailSender, HotelBooking.API.Common.Services.SimulatedEmailSender>();
builder.Services.AddHostedService<BackgroundEmailService>();

// Register Background Notification Service
builder.Services.AddSingleton<HotelBooking.API.Features.CMS.Services.BackgroundNotificationQueue>();
builder.Services.AddSingleton<HotelBooking.API.Features.CMS.Services.INotificationQueue>(sp => sp.GetRequiredService<HotelBooking.API.Features.CMS.Services.BackgroundNotificationQueue>());
builder.Services.AddHostedService<HotelBooking.API.Features.CMS.Services.BackgroundNotificationService>();

// Configure Webhook Policies
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<ISystemSettingService, SystemSettingService>();
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
var secret = builder.Configuration["Jwt:Secret"] ?? "SuperSecretKeyThatIsVeryLongAndSecure12345!";
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

// Configure the HTTP request pipeline.
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseMiddleware<IdempotencyMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/Customer/swagger.json", "Customer API");
        c.SwaggerEndpoint("/swagger/Manager/swagger.json", "Manager API");
        c.SwaggerEndpoint("/swagger/Admin/swagger.json", "Admin API");
        c.DocumentTitle = "The Elegant Enclave's Booking Application";
    });
}

app.UseHttpsRedirection();

app.UseCors("FrontendDev");

app.UseRateLimiter(); // API Hardening

app.UseAuthorization();

app.MapControllers();

app.Run();
