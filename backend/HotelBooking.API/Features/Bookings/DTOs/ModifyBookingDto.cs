using System;
using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace HotelBooking.API.Features.Bookings.DTOs;

public class ModifyBookingDto : IValidatableObject
{
    [Required]
    [DataType(DataType.Date)]
    public DateTime CheckInDate { get; set; }

    [Required]
    [DataType(DataType.Date)]
    public DateTime CheckOutDate { get; set; }

    // Optional base64 RowVersion from the booking the client last loaded — when supplied, a stale
    // (multi-tab) submission is rejected instead of silently overwriting a newer state.
    public string? RowVersion { get; set; }

    // TC001 fix: a Booking has no guest-count column at all (occupancy is only ever checked
    // transiently at hotel-search/creation time against RoomType.Capacity, never persisted onto
    // the booking row), so guest count is genuinely NOT a modifiable property of an existing
    // booking — this field exists purely as a server-side guard so a caller that sends one anyway
    // (bypassing the Angular UI) gets an explicit rejection instead of it being silently ignored.
    // It is never persisted or used for pricing.
    public int? GuestCount { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
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
    }
}
