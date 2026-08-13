using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Features.CMS.Services;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Models;
using HotelBooking.API.Common.Models;

namespace HotelBooking.API.Features.CMS.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly INotificationQueue _notificationQueue;

    public NotificationsController(INotificationService notificationService, INotificationQueue notificationQueue)
    {
        _notificationService = notificationService;
        _notificationQueue = notificationQueue;
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyNotifications()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var notifications = await _notificationService.GetUserNotificationsAsync(userId);
        return Ok(ApiResponse<IEnumerable<Notification>>.SuccessResponse(notifications));
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var success = await _notificationService.MarkAsReadAsync(id, userId);
        if (!success) return NotFound(ApiResponse<object?>.ErrorResponse("Notification not found."));
        return Ok(ApiResponse.SuccessResponse("Notification marked as read."));
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var count = await _notificationService.MarkAllAsReadAsync(userId);
        return Ok(ApiResponse.SuccessResponse($"{count} notification(s) marked as read."));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteNotification(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var success = await _notificationService.DeleteNotificationAsync(id, userId);
        if (!success) return NotFound(ApiResponse<object?>.ErrorResponse("Notification not found."));
        return Ok(ApiResponse.SuccessResponse("Notification deleted."));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    [ApiExplorerSettings(GroupName = "Admin")]
    public async Task<IActionResult> Broadcast([FromBody] NotificationRequestDto dto)
    {
        // Queued, not written synchronously — a broadcast can fan out to every Active user, so it
        // must never block the admin's request the way SendNotificationAsync's in-request paging
        // used to.
        await _notificationQueue.QueueNotificationAsync(dto);
        return Ok(ApiResponse.SuccessResponse("Notification queued for delivery."));
    }
}
