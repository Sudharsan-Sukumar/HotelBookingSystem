using System;
using System.IO;
using System.Threading.Tasks;
using HotelBooking.API.Common.Services;
using Microsoft.AspNetCore.Http;
using NUnit.Framework;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;

namespace HotelBooking.Tests.Common;

[TestFixture]
public class ImageCompressionServiceTests
{
    private ImageCompressionService _service = null!;

    [SetUp]
    public void SetUp() => _service = new ImageCompressionService();

    private static IFormFile BuildImageFormFile(int width, int height, string fileName = "photo.png", string contentType = "image/png")
    {
        using var image = new Image<Rgba32>(width, height);

        // Fill with per-pixel noise (not a solid color) so the PNG doesn't compress away to almost
        // nothing on its own — large dimensions then genuinely need the compression loop to bring
        // the result under the 500KB ceiling.
        var random = new Random(42);
        for (var y = 0; y < image.Height; y++)
        {
            for (var x = 0; x < image.Width; x++)
            {
                image[x, y] = new Rgba32((byte)random.Next(255), (byte)random.Next(255), (byte)random.Next(255));
            }
        }

        var ms = new MemoryStream();
        image.SaveAsPng(ms);
        ms.Position = 0;
        return new FormFile(ms, 0, ms.Length, "File", fileName) { Headers = new Microsoft.AspNetCore.Http.HeaderDictionary(), ContentType = contentType };
    }

    [Test]
    public async Task ValidateAndCompressAsync_SmallValidImage_ReturnsJpegUnderSizeLimit()
    {
        var file = BuildImageFormFile(200, 200);

        var (data, contentType) = await _service.ValidateAndCompressAsync(file, maxSizeKb: 500);

        Assert.That(data.Length, Is.LessThanOrEqualTo(500 * 1024));
        Assert.That(contentType, Is.EqualTo("image/jpeg"));

        // The bytes actually written must still decode as a real image, not just be small.
        using var decoded = Image.Load(data);
        Assert.That(decoded.Width, Is.EqualTo(200));
    }

    [Test]
    public async Task ValidateAndCompressAsync_LargeImage_CompressesUnderSizeLimit()
    {
        var file = BuildImageFormFile(3000, 3000);

        var (data, contentType) = await _service.ValidateAndCompressAsync(file, maxSizeKb: 500);

        Assert.That(data.Length, Is.LessThanOrEqualTo(500 * 1024));
        Assert.That(contentType, Is.EqualTo("image/jpeg"));
    }

    [Test]
    public void ValidateAndCompressAsync_UnsupportedExtension_ThrowsArgumentException()
    {
        var stream = new MemoryStream(new byte[] { 1, 2, 3, 4 });
        var file = new FormFile(stream, 0, stream.Length, "File", "notes.txt") { Headers = new Microsoft.AspNetCore.Http.HeaderDictionary(), ContentType = "text/plain" };

        Assert.ThrowsAsync<ArgumentException>(() => _service.ValidateAndCompressAsync(file));
    }

    [Test]
    public void ValidateAndCompressAsync_MismatchedContentType_ThrowsArgumentException()
    {
        var stream = new MemoryStream(new byte[] { 1, 2, 3, 4 });
        var file = new FormFile(stream, 0, stream.Length, "File", "photo.png") { Headers = new Microsoft.AspNetCore.Http.HeaderDictionary(), ContentType = "application/octet-stream" };

        Assert.ThrowsAsync<ArgumentException>(() => _service.ValidateAndCompressAsync(file));
    }

    [Test]
    public void ValidateAndCompressAsync_CorruptedImageBytes_ThrowsArgumentException()
    {
        // Valid extension and Content-Type header, but the payload is garbage — must be caught by
        // the actual pixel-decode step, not just the extension/MIME allowlist checks.
        var stream = new MemoryStream(new byte[] { 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07 });
        var file = new FormFile(stream, 0, stream.Length, "File", "photo.png") { Headers = new Microsoft.AspNetCore.Http.HeaderDictionary(), ContentType = "image/png" };

        Assert.ThrowsAsync<ArgumentException>(() => _service.ValidateAndCompressAsync(file));
    }

    [Test]
    public void ValidateAndCompressAsync_EmptyFile_ThrowsArgumentException()
    {
        var stream = new MemoryStream();
        var file = new FormFile(stream, 0, 0, "File", "photo.png") { Headers = new Microsoft.AspNetCore.Http.HeaderDictionary(), ContentType = "image/png" };

        Assert.ThrowsAsync<ArgumentException>(() => _service.ValidateAndCompressAsync(file));
    }
}
