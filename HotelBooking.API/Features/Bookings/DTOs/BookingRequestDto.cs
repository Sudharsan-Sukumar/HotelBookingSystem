using System;
using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;
using HotelBooking.API.Common.Constants;

namespace HotelBooking.API.Features.Bookings.DTOs;

public class BookingRequestDto : IValidatableObject
{
    private static readonly string[] AllowedIDProofTypes =
    {
        "Aadhar Card", "Passport", "Driver's License", "PAN"
    };

    [Required]
    public int HotelId { get; set; }

    [Required]
    public int RoomTypeId { get; set; }

    [Required(ErrorMessage = "ID proof type is required.")]
    public string IDProofType { get; set; } = string.Empty;

    [Required(ErrorMessage = "ID proof number is required.")]
    [MaxLength(50)]
    public string IDProofNumber { get; set; } = string.Empty;

    [Required]
    [DataType(DataType.Date)]
    public DateTime CheckInDate { get; set; }

    [Required]
    [DataType(DataType.Date)]
    public DateTime CheckOutDate { get; set; }

    [Required]
    [Range(1, 5, ErrorMessage = "A single booking allows 1-5 rooms.")]
    public int NumberOfRooms { get; set; }

    [MaxLength(500, ErrorMessage = "Special request must not exceed 500 characters.")]
    [RegularExpression(ValidationRegexConstants.SafeText, ErrorMessage = "Invalid special requests format.")]
    public string? SpecialRequests { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!string.IsNullOrEmpty(IDProofType) && Array.IndexOf(AllowedIDProofTypes, IDProofType) < 0)
        {
            yield return new ValidationResult(
                $"IDProofType must be one of: {string.Join(", ", AllowedIDProofTypes)}.",
                new[] { nameof(IDProofType) });
        }

        if (CheckInDate.Date < DateTime.UtcNow.Date)
        {
            yield return new ValidationResult(
                "Check-in date cannot be in the past.",
                new[] { nameof(CheckInDate) });
        }

        if (CheckOutDate.Date <= CheckInDate.Date)
        {
            yield return new ValidationResult(
                "Check-out date must be after check-in date.",
                new[] { nameof(CheckOutDate) });
        }
        else if ((CheckOutDate.Date - CheckInDate.Date).TotalDays > 30)
        {
            yield return new ValidationResult(
                "Maximum stay is 30 nights.",
                new[] { nameof(CheckOutDate) });
        }
        else if ((CheckInDate.Date - DateTime.UtcNow.Date).TotalDays > 365)
        {
            yield return new ValidationResult(
                "Booking window cannot exceed 365 days.",
                new[] { nameof(CheckInDate) });
        }
    }
}
