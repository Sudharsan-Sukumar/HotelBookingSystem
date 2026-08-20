using System;
using System.IO;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace HotelBooking.API.Common.Services;

// Shared image-upload validation + storage used by both hotel/room-type galleries and user
// profile photos. Only ever persists a file path/URL to the database — the image binary lives
// solely on disk under wwwroot, never in a DB column.
public class FileUploadService : IFileUploadService
{
    private static readonly string[] AllowedExtensions = { ".jpg", ".jpeg", ".png" };

    private readonly IWebHostEnvironment _environment;

    public FileUploadService(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    private string WebRoot => _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");

    public async Task<string> SaveImageAsync(IFormFile file, string subfolder, int maxSizeMb)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("File is empty.");

        if (file.Length > maxSizeMb * 1024 * 1024)
            throw new ArgumentException($"File size exceeds {maxSizeMb}MB limit.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (Array.IndexOf(AllowedExtensions, ext) < 0)
            throw new ArgumentException("Invalid file format. Only JPG, JPEG, and PNG are allowed.");

        // MIME Type Validation (Magic Bytes) - verifies the real file signature instead of trusting the extension, then rewinds the stream so downstream copy/resize logic still reads from the start.
        // Fail-Closed Stream Read - a genuine I/O exception while reading the signature bytes (not just a too-small file naturally failing the match) must not bubble up as an unhandled 500; treat it the same as a failed signature match and reject the upload.
        using (var headerStream = file.OpenReadStream())
        {
            try
            {
                var header = new byte[4];
                int bytesRead = await headerStream.ReadAsync(header.AsMemory(0, header.Length));
                bool isJpeg = bytesRead >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF;
                bool isPng = bytesRead >= 4 && header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47;

                if (!isJpeg && !isPng)
                    throw new ArgumentException("Invalid file format. Only JPG, JPEG, and PNG are allowed.");

                if (headerStream.CanSeek)
                    headerStream.Seek(0, SeekOrigin.Begin);
            }
            catch (ArgumentException)
            {
                throw;
            }
            catch (Exception)
            {
                throw new ArgumentException("Invalid file format. Only JPG, JPEG, and PNG are allowed.");
            }
        }

        var uploadsFolder = Path.Combine(WebRoot, subfolder);
        if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);

        var uniqueFileName = Guid.NewGuid().ToString() + "_" + Path.GetFileName(file.FileName);
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using (var fileStream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(fileStream);
        }

        return $"/{subfolder}/{uniqueFileName}";
    }

    public async Task<string> SaveImageBytesAsync(byte[] data, string originalFileName, string subfolder)
    {
        if (data == null || data.Length == 0)
            throw new ArgumentException("File is empty.");

        var uploadsFolder = Path.Combine(WebRoot, subfolder);
        if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);

        var uniqueFileName = Guid.NewGuid().ToString() + "_" + Path.GetFileName(originalFileName);
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        await File.WriteAllBytesAsync(filePath, data);

        return $"/{subfolder}/{uniqueFileName}";
    }

    public void DeleteImage(string url)
    {
        if (string.IsNullOrWhiteSpace(url)) return;

        var filePath = Path.Combine(WebRoot, url.TrimStart('/'));
        if (File.Exists(filePath))
            File.Delete(filePath);
    }
}
