using System;
using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;
using HotelBooking.API.Common.Constants;

namespace HotelBooking.API.Features.Hotels.DTOs;

public class SearchRequestDto : IValidatableObject
{
    [Required(ErrorMessage = "Destination city is required.")]
    [RegularExpression(ValidationRegexConstants.Name, ErrorMessage = "Invalid City format.")]
    public string DestinationCity { get; set; } = string.Empty;

    [Required(ErrorMessage = "Check-in date is required.")]
    [DataType(DataType.Date)]
    public DateTime CheckInDate { get; set; }

    [Required(ErrorMessage = "Check-out date is required.")]
    [DataType(DataType.Date)]
    public DateTime CheckOutDate { get; set; }

    [Required(ErrorMessage = "Number of guests is required.")]
    [Range(1, 10, ErrorMessage = "Number of guests must be between 1 and 10.")]
    public int Guests { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Page number must be at least 1.")]
    public int PageNumber { get; set; } = 1;

    [Range(1, 100, ErrorMessage = "Page size must be between 1 and 100.")]
    public int PageSize { get; set; } = 20;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (CheckInDate.Date < DateTime.UtcNow.Date)
        {
            yield return new ValidationResult(
                "Check-in date cannot be in the past.",
                new[] { nameof(CheckInDate) });
        }

        if (CheckOutDate <= CheckInDate)
        {
            yield return new ValidationResult(
                "Check-out date must be after check-in date.",
                new[] { nameof(CheckOutDate) });
        }
        else if ((CheckOutDate - CheckInDate).TotalDays > 30)
        {
            yield return new ValidationResult(
                "Maximum stay allowed is 30 nights.",
                new[] { nameof(CheckOutDate) });
        }
    }
}
