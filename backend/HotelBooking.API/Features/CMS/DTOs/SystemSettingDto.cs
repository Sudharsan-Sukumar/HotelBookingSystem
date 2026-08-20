using System;
using System.ComponentModel.DataAnnotations;
using HotelBooking.API.Common.Constants;

namespace HotelBooking.API.Features.CMS.DTOs;

public class SystemSettingDto
{
    [Required]
    [RegularExpression(ValidationRegexConstants.AlphaNumericWithSpaces, ErrorMessage = "Invalid Key.")]
    public string Key { get; set; } = string.Empty;

    [Required]
    public string Value { get; set; } = string.Empty;

    // Surfaces SystemSetting.UpdatedAt (already tracked on the model, previously never mapped
    // into the DTO) so admin can see whether/when the base policy value was actually changed.
    public DateTime? UpdatedAt { get; set; }
}
