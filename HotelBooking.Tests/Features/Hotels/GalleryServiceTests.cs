using System;
using System.IO;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Hotels.DTOs;
using HotelBooking.API.Features.Hotels.Models;
using HotelBooking.API.Features.Hotels.Services;
using Microsoft.AspNetCore.Http;
using NUnit.Framework;
using HotelBooking.Tests;

namespace HotelBooking.Tests.Features.Hotels;

[TestFixture]
public class GalleryServiceTests
{
    private ApplicationDbContext _context = null!;
    private GalleryService _service = null!;
    private FakeFileUploadService _fileUploadService = null!;
    private Hotel _hotel = null!;
    private const int ManagerId = 42;

    [SetUp]
    public void SetUp()
    {
        _context = TestDbContextFactory.Create();
        _fileUploadService = new FakeFileUploadService();
        _service = new GalleryService(_context, _fileUploadService, new FakeImageCompressionService(), new FakeAuditLogService());

        _hotel = new Hotel
        {
            HotelCustomId = "HTL-TEST-0002",
            Name = "Gallery Test Hotel " + Guid.NewGuid(),
            City = "Chennai",
            IsActive = true,
            RowVersion = new byte[8]
        };
        _hotel.ManagerIds.Add(ManagerId);
        _context.Hotels.Add(_hotel);
        _context.SaveChanges();
    }

    [TearDown]
    public void TearDown() => _context.Dispose();

    private static IFormFile FakeFormFile(byte[] content, string fileName = "photo.png")
    {
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, stream.Length, "File", fileName);
    }

    [Test]
    public async Task UploadHotelImageAsync_StoresCompressedBinaryAlongsidePath()
    {
        var request = new ImageUploadDto { EntityId = _hotel.Id, File = FakeFormFile(new byte[] { 9, 9, 9 }), IsPrimary = true };

        var image = await _service.UploadHotelImageAsync(request, ManagerId, isAdmin: false);

        Assert.That(image.Url, Is.Not.Empty);
        Assert.That(image.ImageData, Is.Not.Null.And.Not.Empty);
        Assert.That(image.ContentType, Is.EqualTo("image/jpeg"));
        Assert.That(image.IsPrimary, Is.True);
    }

    [Test]
    public void UploadHotelImageAsync_ManagerNotAssignedToHotel_ThrowsUnauthorizedAccessException()
    {
        var request = new ImageUploadDto { EntityId = _hotel.Id, File = FakeFormFile(new byte[] { 1, 2, 3 }) };

        Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            _service.UploadHotelImageAsync(request, callerId: 999, isAdmin: false));
    }

    [Test]
    public async Task GetHotelImageContentAsync_AfterUpload_ReturnsStoredBytesAndContentType()
    {
        var request = new ImageUploadDto { EntityId = _hotel.Id, File = FakeFormFile(new byte[] { 5, 5, 5 }) };
        var uploaded = await _service.UploadHotelImageAsync(request, ManagerId, isAdmin: false);

        var content = await _service.GetHotelImageContentAsync(uploaded.Id);

        Assert.That(content, Is.Not.Null);
        Assert.That(content!.Value.Data, Is.Not.Empty);
        Assert.That(content.Value.ContentType, Is.EqualTo("image/jpeg"));
    }

    [Test]
    public async Task GetHotelImageContentAsync_UnknownImageId_ReturnsNull()
    {
        var content = await _service.GetHotelImageContentAsync(999999);
        Assert.That(content, Is.Null);
    }
}
