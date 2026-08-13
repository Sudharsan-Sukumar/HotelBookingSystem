using System;
using HotelBooking.API.Features.Hotels.Models;

namespace HotelBooking.API.Features.Hotels.DTOs;

// QA Defect (High): HotelImageInfo.ImageData/ContentType can't carry [JsonIgnore] — that type is
// also what ApplicationDbContext's ConfigureJsonList serializes into the Hotel.Images JSON column
// via the SAME System.Text.Json attribute-driven pipeline, so [JsonIgnore] there would silently
// strip the binary before it's ever persisted. This DTO is the API-response-only shape instead —
// callers get the URL/metadata; the actual bytes are only ever served via GET .../content.
public class HotelImageResponseDto
{
    public int Id { get; set; }
    public string Url { get; set; } = string.Empty;
    public string Caption { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }
    public DateTime UploadedAt { get; set; }

    public static HotelImageResponseDto FromModel(HotelImageInfo image) => new()
    {
        Id = image.Id,
        Url = image.Url,
        Caption = image.Caption,
        IsPrimary = image.IsPrimary,
        UploadedAt = image.UploadedAt
    };
}
