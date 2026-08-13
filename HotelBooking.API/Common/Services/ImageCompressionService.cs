using Microsoft.AspNetCore.Http;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;

namespace HotelBooking.API.Common.Services;

// Re-encodes every accepted upload as JPEG so a single quality/resolution loop can reliably hit
// the maxSizeKb target regardless of the original format (PNG in particular has no quality knob).
public class ImageCompressionService : IImageCompressionService
{
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
    private static readonly string[] AllowedContentTypes = { "image/jpeg", "image/pjpeg", "image/png", "image/webp" };
    private const string OutputContentType = "image/jpeg";

    public async Task<(byte[] Data, string ContentType)> ValidateAndCompressAsync(IFormFile file, int maxSizeKb = 500)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("File is empty.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (Array.IndexOf(AllowedExtensions, ext) < 0)
            throw new ArgumentException("Invalid file format. Only JPG, JPEG, PNG, and WEBP are allowed.");

        if (Array.IndexOf(AllowedContentTypes, file.ContentType?.ToLowerInvariant() ?? string.Empty) < 0)
            throw new ArgumentException("Invalid content type. The uploaded file is not a recognized image MIME type.");

        Image image;
        try
        {
            using var uploadStream = file.OpenReadStream();
            // Decodes the actual pixel content — a renamed .txt or truncated/corrupted file fails
            // here even though its extension and Content-Type header both claimed to be an image.
            image = await Image.LoadAsync(uploadStream);
        }
        catch (UnknownImageFormatException)
        {
            throw new ArgumentException("The uploaded file is not a valid or supported image.");
        }
        catch (InvalidImageContentException)
        {
            throw new ArgumentException("The uploaded image file is corrupted.");
        }

        using (image)
        {
            var maxSizeBytes = maxSizeKb * 1024;
            byte[] data = await EncodeAsync(image, quality: 85);

            if (data.Length <= maxSizeBytes)
                return (data, OutputContentType);

            // First bring quality down; if that alone isn't enough, start shrinking resolution too
            // (a 500KB ceiling can't always be hit by quality alone on a very large source image).
            for (var quality = 75; quality >= 25 && data.Length > maxSizeBytes; quality -= 10)
            {
                data = await EncodeAsync(image, quality);
            }

            var scale = 0.85;
            while (data.Length > maxSizeBytes && scale > 0.15)
            {
                var newWidth = Math.Max(1, (int)(image.Width * scale));
                var newHeight = Math.Max(1, (int)(image.Height * scale));
                using var resized = image.Clone(ctx => ctx.Resize(newWidth, newHeight));
                data = await EncodeAsync(resized, quality: 60);
                scale -= 0.15;
            }

            if (data.Length > maxSizeBytes)
                throw new ArgumentException($"Unable to compress image below {maxSizeKb}KB.");

            return (data, OutputContentType);
        }
    }

    private static async Task<byte[]> EncodeAsync(Image image, int quality)
    {
        using var ms = new MemoryStream();
        await image.SaveAsync(ms, new JpegEncoder { Quality = quality });
        return ms.ToArray();
    }
}
