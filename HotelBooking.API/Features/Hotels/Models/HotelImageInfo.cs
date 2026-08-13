using System;

namespace HotelBooking.API.Features.Hotels.Models;

// Owned JSON element stored inside Hotel.Images — replaces the former standalone HotelImages table.
// Id is unique across ALL hotels (assigned as max+1 over every hotel's image list), not just within
// one hotel, since the DELETE /api/galleries/hotel/{imageId} route only ever took a bare image id.
public class HotelImageInfo
{
    public int Id { get; set; }
    public string Url { get; set; } = string.Empty;
    public string Caption { get; set; } = string.Empty;
    public string FileHash { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    // Compressed (<=500KB) JPEG bytes for this image — Url points at the same bytes written to disk.
    // The original, uncompressed upload is never persisted.
    public byte[]? ImageData { get; set; }
    public string? ContentType { get; set; }
}
