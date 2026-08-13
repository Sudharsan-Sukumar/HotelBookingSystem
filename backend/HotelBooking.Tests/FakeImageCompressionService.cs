using System.Threading.Tasks;
using HotelBooking.API.Common.Services;
using Microsoft.AspNetCore.Http;

namespace HotelBooking.Tests;

internal class FakeImageCompressionService : IImageCompressionService
{
    public Task<(byte[] Data, string ContentType)> ValidateAndCompressAsync(IFormFile file, int maxSizeKb = 500)
    {
        return Task.FromResult((new byte[] { 1, 2, 3 }, "image/jpeg"));
    }
}
