using System;
using System.ComponentModel.DataAnnotations;

namespace HotelBooking.API.Features.CMS.DTOs;

public class HeroContentDto
{
    [Required]
    [MaxLength(200, ErrorMessage = "Heading must not exceed 200 characters.")]
    public string Heading { get; set; } = string.Empty;

    [Required]
    [MaxLength(300, ErrorMessage = "Subheading must not exceed 300 characters.")]
    public string Subheading { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string BackgroundImageUrl { get; set; } = string.Empty;
}

public class HeroContentResponseDto : HeroContentDto
{
    public int Id { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class AboutContentDto
{
    [Required]
    [MaxLength(200, ErrorMessage = "Heading must not exceed 200 characters.")]
    public string Heading { get; set; } = string.Empty;

    [Required]
    [MaxLength(300, ErrorMessage = "Subheading must not exceed 300 characters.")]
    public string Subheading { get; set; } = string.Empty;

    [Required]
    [MaxLength(5000, ErrorMessage = "Brand history must not exceed 5000 characters.")]
    public string History { get; set; } = string.Empty;
}

public class AboutContentResponseDto : AboutContentDto
{
    public int Id { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class ContactContentDto
{
    [Required]
    [RegularExpression(@"^[0-9+\-\s()•,]{7,60}$", ErrorMessage = "Enter a valid phone number / list of phone numbers.")]
    public string Phone { get; set; } = string.Empty;

    [Required]
    [EmailAddress(ErrorMessage = "Enter a valid email address.")]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(300, ErrorMessage = "Address text must not exceed 300 characters.")]
    public string Address { get; set; } = string.Empty;
}

public class ContactContentResponseDto : ContactContentDto
{
    public int Id { get; set; }
    public DateTime UpdatedAt { get; set; }
}
