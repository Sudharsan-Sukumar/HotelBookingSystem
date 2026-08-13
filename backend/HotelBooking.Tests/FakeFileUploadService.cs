using System.Threading.Tasks;
using HotelBooking.API.Common.Services;
using Microsoft.AspNetCore.Http;

namespace HotelBooking.Tests;

internal class FakeFileUploadService : IFileUploadService
{
    public string? LastSavedSubfolder { get; private set; }
    public string? LastDeletedUrl { get; private set; }
    private int _counter;

    public Task<string> SaveImageAsync(IFormFile file, string subfolder, int maxSizeMb)
    {
        LastSavedSubfolder = subfolder;
        return Task.FromResult($"/{subfolder}/fake_{++_counter}.png");
    }

    public Task<string> SaveImageBytesAsync(byte[] data, string originalFileName, string subfolder)
    {
        LastSavedSubfolder = subfolder;
        return Task.FromResult($"/{subfolder}/fake_{++_counter}.png");
    }

    public void DeleteImage(string url)
    {
        LastDeletedUrl = url;
    }
}
