using System.Security.Claims;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;

namespace HotelBooking.API.Authorization.Filters;

/// <summary>
/// Blocks access to all authenticated endpoints except Auth and Profile (change-password/view)
/// while a user's ForcePasswordChange flag is set, per FR-2.4.
/// </summary>
public class ForcePasswordChangeFilter : IAsyncActionFilter
{
    public async System.Threading.Tasks.Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var user = context.HttpContext.User;
        var mustChange = user.FindFirstValue("ForcePasswordChange");

        if (mustChange == "True" && context.ActionDescriptor is ControllerActionDescriptor descriptor)
        {
            var controllerName = descriptor.ControllerName;
            var allowed = controllerName == "Auth" || controllerName == "Profile";

            if (!allowed)
            {
                context.Result = new Microsoft.AspNetCore.Mvc.ObjectResult(
                    new { message = "You must change your temporary password to proceed." })
                {
                    StatusCode = 403
                };
                return;
            }
        }

        await next();
    }
}
