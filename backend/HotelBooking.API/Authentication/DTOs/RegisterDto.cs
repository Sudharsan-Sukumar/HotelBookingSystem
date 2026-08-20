using System;
using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;
using HotelBooking.API.Common.Constants;

namespace HotelBooking.API.Authentication.DTOs;

public class RegisterDto : IValidatableObject
{
    [Required]
    [RegularExpression(ValidationRegexConstants.Name, ErrorMessage = "Name must be 2-80 characters (letters and spaces only).")]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [RegularExpression(ValidationRegexConstants.LastName, ErrorMessage = "Last Name must be 1-80 characters (letters and spaces only).")]
    public string LastName { get; set; } = string.Empty;

    [Required]
    public DateOnly DateOfBirth { get; set; }

    [Required]
    [RegularExpression(ValidationRegexConstants.Email, ErrorMessage = "Invalid email format. Please enter a valid email (e.g. user@gmail.com).")]
    public string Email { get; set; } = string.Empty;

    [Required]
    [RegularExpression(ValidationRegexConstants.Password, ErrorMessage = "Password must be at least 8 characters with one digit and one special character.")]
    public string Password { get; set; } = string.Empty;

    // BUG-002 fix: this field never existed, so a mismatched confirm-password from a direct API
    // call (bypassing the Angular frontend's own client-side check) was silently accepted.
    [Required]
    [Compare("Password", ErrorMessage = "Passwords do not match.")]
    public string ConfirmPassword { get; set; } = string.Empty;

    [Required]
    [RegularExpression(ValidationRegexConstants.PhoneIndia, ErrorMessage = "Phone must be exactly 10 digits and start with 6, 7, 8, or 9.")]
    public string Phone { get; set; } = string.Empty;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var age = today.Year - DateOfBirth.Year;
        
        if (DateOfBirth > today.AddYears(-age)) 
        {
            age--;
        }
        
        if (age < 18)
        {
            yield return new ValidationResult(
                "You must be at least 18 years old to register.",
                new[] { nameof(DateOfBirth) });
        }
    }
}
