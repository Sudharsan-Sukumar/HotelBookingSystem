using System;
using System.ComponentModel.DataAnnotations;

namespace HotelBooking.API.Features.CMS.DTOs;

public class GeneralPolicyResponseDto
{
    public string PolicyType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
}

public class GeneralPolicyRequestDto
{
    [Required]
    [StringLength(200, MinimumLength = 2)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [StringLength(20000, MinimumLength = 1)]
    public string Content { get; set; } = string.Empty;
}
