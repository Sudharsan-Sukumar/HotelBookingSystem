using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Services;
using HotelBooking.API.Common.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HotelBooking.API.Common.Models;

namespace HotelBooking.API.Features.CMS.Controllers;

// Real Content Management: lets Admin customize what the customer-facing landing page shows
// (Hero banner, About section, Contact/footer details) and manage Help Center articles.
[ApiController]
[Route("api/content")]
[ApiExplorerSettings(GroupName = "Admin")]
[Tags("CMS")]
public class ContentController : ControllerBase
{
    private readonly ISiteContentService _siteContentService;
    private readonly IHelpArticleService _helpArticleService;
    private readonly IFileUploadService _fileUploadService;

    public ContentController(ISiteContentService siteContentService, IHelpArticleService helpArticleService, IFileUploadService fileUploadService)
    {
        _siteContentService = siteContentService;
        _helpArticleService = helpArticleService;
        _fileUploadService = fileUploadService;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "0");

    // ── Hero banner ──────────────────────────────────────────────────────────
    [HttpGet("hero")]
    public async Task<IActionResult> GetHero() => Ok(ApiResponse<HeroContentResponseDto>.SuccessResponse(await _siteContentService.GetHeroAsync()));

    [HttpPut("hero")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateHero([FromBody] HeroContentDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ApiResponse<object?>.ErrorResponse("Validation failed."));
        return Ok(ApiResponse<HeroContentResponseDto>.SuccessResponse(await _siteContentService.UpdateHeroAsync(dto, GetUserId()), "Hero content updated successfully."));
    }

    // Lets the Admin pick an image file from their local machine for the Hero banner instead of
    // typing a URL by hand. Only uploads and returns the resulting URL — saving it against the
    // Hero record still goes through the existing PUT above, unchanged.
    [HttpPost("hero/image")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UploadHeroImage([FromForm] HeroImageUploadDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ApiResponse<object?>.ErrorResponse("Validation failed."));

        try
        {
            var url = await _fileUploadService.SaveImageAsync(dto.File, "images/hero", maxSizeMb: 5);
            return Ok(ApiResponse<string>.SuccessResponse(url, "Hero image uploaded successfully."));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    // ── About section ────────────────────────────────────────────────────────
    [HttpGet("about")]
    public async Task<IActionResult> GetAbout() => Ok(ApiResponse<AboutContentResponseDto>.SuccessResponse(await _siteContentService.GetAboutAsync()));

    [HttpPut("about")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateAbout([FromBody] AboutContentDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ApiResponse<object?>.ErrorResponse("Validation failed."));
        return Ok(ApiResponse<AboutContentResponseDto>.SuccessResponse(await _siteContentService.UpdateAboutAsync(dto, GetUserId()), "About content updated successfully."));
    }

    // ── Contact / footer ─────────────────────────────────────────────────────
    [HttpGet("contact")]
    public async Task<IActionResult> GetContact() => Ok(ApiResponse<ContactContentResponseDto>.SuccessResponse(await _siteContentService.GetContactAsync()));

    [HttpPut("contact")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateContact([FromBody] ContactContentDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ApiResponse<object?>.ErrorResponse("Validation failed."));
        return Ok(ApiResponse<ContactContentResponseDto>.SuccessResponse(await _siteContentService.UpdateContactAsync(dto, GetUserId()), "Contact content updated successfully."));
    }

    // ── Help Center articles ─────────────────────────────────────────────────
    [HttpGet("help-articles")]
    public async Task<IActionResult> GetHelpArticles([FromQuery] bool publishedOnly = true)
    {
        return Ok(ApiResponse<IEnumerable<HelpArticleResponseDto>>.SuccessResponse(await _helpArticleService.GetAllAsync(publishedOnly)));
    }

    [HttpGet("help-articles/{id}")]
    public async Task<IActionResult> GetHelpArticle(int id)
    {
        var article = await _helpArticleService.GetByIdAsync(id);
        if (article == null) return NotFound(ApiResponse<object?>.ErrorResponse("Help article not found."));
        return Ok(ApiResponse<HelpArticleResponseDto>.SuccessResponse(article));
    }

    [HttpPost("help-articles")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateHelpArticle([FromBody] HelpArticleRequestDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ApiResponse<object?>.ErrorResponse("Validation failed."));
        var article = await _helpArticleService.CreateAsync(dto, GetUserId());
        return CreatedAtAction(nameof(GetHelpArticle), new { id = article.Id },
            ApiResponse<HelpArticleResponseDto>.SuccessResponse(article, "Help article created successfully."));
    }

    [HttpPut("help-articles/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateHelpArticle(int id, [FromBody] HelpArticleRequestDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ApiResponse<object?>.ErrorResponse("Validation failed."));

        try
        {
            return Ok(ApiResponse<HelpArticleResponseDto>.SuccessResponse(await _helpArticleService.UpdateAsync(id, dto), "Help article updated successfully."));
        }
        catch (ArgumentException ex)
        {
            return NotFound(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpDelete("help-articles/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteHelpArticle(int id)
    {
        var success = await _helpArticleService.DeleteAsync(id);
        if (!success) return NotFound(ApiResponse<object?>.ErrorResponse("Help article not found."));
        return Ok(ApiResponse.SuccessResponse("Help article deleted successfully."));
    }
}
