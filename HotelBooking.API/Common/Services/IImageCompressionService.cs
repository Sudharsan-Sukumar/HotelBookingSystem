using Microsoft.AspNetCore.Http;

namespace HotelBooking.API.Common.Services;

public interface IImageCompressionService
{
    // Validates that `file` is a genuine, decodable image of an allowed type, then re-encodes it
    // as JPEG at decreasing quality/resolution until the result is at or under maxSizeKb.
    // Throws ArgumentException for unsupported/invalid/corrupted files. Never returns the
    // original uncompressed bytes.
    Task<(byte[] Data, string ContentType)> ValidateAndCompressAsync(IFormFile file, int maxSizeKb = 500);
}
