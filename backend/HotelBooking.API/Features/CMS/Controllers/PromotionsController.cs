using HotelBooking.API.Common.Models;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HotelBooking.API.Features.CMS.Controllers;

[ApiController]
[Route("api/[controller]")]
[ApiExplorerSettings(GroupName = "Admin")]
[Tags("CMS")]
public class PromotionsController : ControllerBase
{
    private readonly IPromotionService _promotionService;

    public PromotionsController(IPromotionService promotionService)
    {
        _promotionService = promotionService;
    }

    /// <summary>Public list — only active promotions, unless called by an authenticated Admin.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var isAdmin = User.IsInRole("Admin");
        var promotions = await _promotionService.GetAllPromotionsAsync(isAdmin);
        return Ok(ApiResponse<object>.SuccessResponse(promotions));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var promotion = await _promotionService.GetPromotionByIdAsync(id);
        if (promotion == null) return NotFound(ApiResponse<object?>.ErrorResponse("Promotion not found."));
        return Ok(ApiResponse<object>.SuccessResponse(promotion));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] PromotionRequestDto dto)
    {
        var created = await _promotionService.CreatePromotionAsync(dto);
        return CreatedAtAction(nameof(GetById), new { id = created.Id },
            ApiResponse<object>.SuccessResponse(created, "Promotion created successfully."));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] PromotionRequestDto dto)
    {
        var updated = await _promotionService.UpdatePromotionAsync(id, dto);
        if (!updated) return NotFound(ApiResponse<object?>.ErrorResponse("Promotion not found."));
        return Ok(ApiResponse.SuccessResponse("Promotion updated successfully."));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await _promotionService.DeletePromotionAsync(id);
        if (!deleted) return NotFound(ApiResponse<object?>.ErrorResponse("Promotion not found."));
        return Ok(ApiResponse.SuccessResponse("Promotion deleted successfully."));
    }
}
