using Microsoft.AspNetCore.Http;

namespace HotelBooking.API.Common.Services;

public interface IFileUploadService
{
    // Validates extension/size, saves the file under wwwroot/{subfolder}/, and returns the
    // public path/URL to store (e.g. "/images/profiles/{guid}_{filename}") — never the binary itself.
    Task<string> SaveImageAsync(IFormFile file, string subfolder, int maxSizeMb);

    // Writes already-processed bytes (e.g. output of IImageCompressionService) under wwwroot/{subfolder}/,
    // keeping originalFileName's extension in the generated name, and returns the public path/URL.
    // Used where the caller must also persist a file path alongside binary stored elsewhere (DB column).
    Task<string> SaveImageBytesAsync(byte[] data, string originalFileName, string subfolder);

    // Best-effort delete of a previously-saved file, given the URL SaveImageAsync returned.
    void DeleteImage(string url);
}
