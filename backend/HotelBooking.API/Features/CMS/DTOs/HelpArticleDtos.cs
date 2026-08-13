using System;
using System.ComponentModel.DataAnnotations;

namespace HotelBooking.API.Features.CMS.DTOs;

public class HelpArticleRequestDto
{
    [Required]
    [MaxLength(200, ErrorMessage = "Title must not exceed 200 characters.")]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(100, ErrorMessage = "Category must not exceed 100 characters.")]
    public string Category { get; set; } = string.Empty;

    [Required]
    [MaxLength(10000, ErrorMessage = "Content must not exceed 10000 characters.")]
    public string Content { get; set; } = string.Empty;

    [MaxLength(300, ErrorMessage = "Tags must not exceed 300 characters.")]
    public string? Tags { get; set; }

    public bool IsPublished { get; set; } = true;
}

public class HelpArticleResponseDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? Tags { get; set; }
    public bool IsPublished { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
