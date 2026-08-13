using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using HotelBooking.API.Common.Constants;

namespace HotelBooking.API.Authentication.DTOs;

public class ResetPasswordDto : IValidatableObject
{
    [Required]
    [RegularExpression(ValidationRegexConstants.Email, ErrorMessage = "Invalid email format.")]
    public string Email { get; set; } = string.Empty;

    // The 6-digit OTP emailed by ForgotPasswordAsync — same format/mechanism as VerifyEmailDto.Token.
    [Required]
    [RegularExpression(ValidationRegexConstants.Otp, ErrorMessage = "OTP must be a 6-digit code.")]
    public string Token { get; set; } = string.Empty;

    // Belt-and-suspenders alongside the OTP: the account's CURRENT password, verified against the
    // stored hash before the reset is allowed to proceed.
    [Required]
    public string OldPassword { get; set; } = string.Empty;

    [Required]
    [RegularExpression(ValidationRegexConstants.Password, ErrorMessage = "Password must be at least 8 characters with one digit and one special character.")]
    public string NewPassword { get; set; } = string.Empty;

    [Required]
    public string ConfirmNewPassword { get; set; } = string.Empty;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (NewPassword != ConfirmNewPassword)
        {
            yield return new ValidationResult(
                "New password and confirm password do not match.",
                new[] { nameof(ConfirmNewPassword) });
        }

        if (!string.IsNullOrEmpty(OldPassword) && NewPassword == OldPassword)
        {
            yield return new ValidationResult(
                "New password must be different from the old password.",
                new[] { nameof(NewPassword) });
        }
    }
}
