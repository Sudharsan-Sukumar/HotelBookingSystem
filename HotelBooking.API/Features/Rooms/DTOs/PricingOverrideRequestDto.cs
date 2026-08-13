using System;
using System.ComponentModel.DataAnnotations;

namespace HotelBooking.API.Features.Rooms.DTOs;

public class PricingOverrideRequestDto : IValidatableObject
{
    [Required]
    public int RoomTypeId { get; set; }

    [Required]
    [DataType(DataType.Date)]
    public DateTime StartDate { get; set; }

    [Required]
    [DataType(DataType.Date)]
    public DateTime EndDate { get; set; }

    [Required]
    [Range(0.01, (double)decimal.MaxValue, ErrorMessage = "Price must be greater than zero.")]
    public decimal Price { get; set; }

    public System.Collections.Generic.IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (StartDate.Date < DateTime.UtcNow.Date)
        {
            yield return new ValidationResult(
                "StartDate cannot be in the past.",
                new[] { nameof(StartDate) });
        }

        if (EndDate <= StartDate)
        {
            yield return new ValidationResult(
                "EndDate must be after StartDate.",
                new[] { nameof(EndDate) });
        }
    }
}
