using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace HotelBooking.API.Features.Swagger;

// Swashbuckle registers AddSecurityDefinition globally, so without this filter every one of the
// three named schemes (CustomerAuth/ManagerAuth/AdminAuth) would appear in every document's
// Authorize dialog — exactly the "redundant/misleading" clutter this correction asked to remove.
// This keeps only the scheme that actually belongs to the current document.
public class PerActorSecuritySchemeDocumentFilter : IDocumentFilter
{
    private static readonly Dictionary<string, string> SchemeIdByDocument = new()
    {
        ["Customer"] = "CustomerAuth",
        ["Manager"] = "ManagerAuth",
        ["Admin"] = "AdminAuth"
    };

    public void Apply(OpenApiDocument swaggerDoc, DocumentFilterContext context)
    {
        if (swaggerDoc.Components?.SecuritySchemes == null) return;
        if (!SchemeIdByDocument.TryGetValue(context.DocumentName, out var ownSchemeId)) return;

        var toRemove = swaggerDoc.Components.SecuritySchemes.Keys
            .Where(id => id != ownSchemeId)
            .ToList();

        foreach (var id in toRemove)
            swaggerDoc.Components.SecuritySchemes.Remove(id);
    }
}

// Attaches the actor-specific security scheme (CustomerAuth / ManagerAuth / AdminAuth) to an
// operation only when that operation is actually behind [Authorize] and lives in the matching
// Swagger document — so each of the three "Authorize" padlocks in Swagger UI only ever appears
// on endpoints it's relevant to, instead of one generic "Bearer" padlock shown everywhere.
// This is purely a documentation/UI concern: it does not add, remove, or alter any real
// [Authorize]/[Authorize(Roles=...)] enforcement, which still happens entirely server-side.
public class PerActorAuthorizeOperationFilter : IOperationFilter
{
    private static readonly Dictionary<string, string> SchemeIdByDocument = new()
    {
        ["Customer"] = "CustomerAuth",
        ["Manager"] = "ManagerAuth",
        ["Admin"] = "AdminAuth"
    };

    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var endpointMetadata = context.ApiDescription.ActionDescriptor.EndpointMetadata;

        bool requiresAuth = endpointMetadata.OfType<AuthorizeAttribute>().Any();
        bool allowsAnonymous = endpointMetadata.OfType<AllowAnonymousAttribute>().Any();

        if (!requiresAuth || allowsAnonymous)
            return;

        if (!SchemeIdByDocument.TryGetValue(context.DocumentName, out var schemeId))
            return;

        operation.Security = new List<OpenApiSecurityRequirement>
        {
            new OpenApiSecurityRequirement
            {
                [new OpenApiSecurityScheme
                {
                    Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = schemeId }
                }] = Array.Empty<string>()
            }
        };
    }
}
