using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HotelBooking.API.Features.Rooms.DTOs;

public class BlockedDateRequestDto : IValidatableObject
{
    [Required]
    public int RoomTypeId { get; set; }

    [Required]
    public DateTime StartDate { get; set; }

    [Required]
    public DateTime EndDate { get; set; }

    [MaxLength(200)]
    public string? Reason { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (StartDate.Date < DateTime.UtcNow.Date)
        {
            yield return new ValidationResult("Blocked dates cannot start in the past.", new[] { nameof(StartDate) });
        }
        if (EndDate.Date <= StartDate.Date)
        {
            yield return new ValidationResult("End date must be after start date.", new[] { nameof(EndDate) });
        }
    }
}
