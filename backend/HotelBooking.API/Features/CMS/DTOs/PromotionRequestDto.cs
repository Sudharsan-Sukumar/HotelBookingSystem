using System;
using System.ComponentModel.DataAnnotations;
using HotelBooking.API.Common.Constants;

namespace HotelBooking.API.Features.CMS.DTOs;

public class PromotionRequestDto
{
    [Required]
    [RegularExpression(ValidationRegexConstants.SafeText, ErrorMessage = "Invalid Title format.")]
    public string Title { get; set; } = string.Empty;

    [Required]
    [RegularExpression(ValidationRegexConstants.SafeText, ErrorMessage = "Invalid Description format.")]
    public string DiscountDescription { get; set; } = string.Empty;

    [Required]
    [RegularExpression("^[A-Z0-9]{5,15}$", ErrorMessage = "Coupon Code must be 5-15 uppercase alphanumeric characters.")]
    public string CouponCode { get; set; } = string.Empty;

    [Required]
    public DateTime ValidUntil { get; set; }

    public string ImageUrl { get; set; } = string.Empty;

    [Required]
    public bool IsActive { get; set; }
}
