using System;
using System.Threading.Tasks;
using HotelBooking.API.Users.DTOs;
using HotelBooking.API.Users.Models;
using HotelBooking.API.Users.Services;
using NUnit.Framework;

namespace HotelBooking.Tests.Features.Users;

[TestFixture]
public class UsersTests
{
    private HotelBooking.API.Data.ApplicationDbContext _context = null!;
    private ProfileService _service = null!;
    private FakeFileUploadService _fileUploadService = null!;
    private User _user = null!;

    [SetUp]
    public void SetUp()
    {
        _context = TestDbContextFactory.Create();
        _fileUploadService = new FakeFileUploadService();
        _service = new ProfileService(_context, new FakeAuditLogService(), _fileUploadService, new FakeImageCompressionService());

        _context.Roles.Add(new Role { Id = 2, Name = "Customer" });
        _user = new User
        {
            FirstName = "Jane",
            LastName = "Doe",
            Email = "jane@hbs.local",
            Phone = "9876543210",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Current@123", workFactor: 4),
            RoleId = 2,
            Status = "Active"
        };
        _context.Users.Add(_user);
        _context.SaveChanges();
    }

    [TearDown]
    public void TearDown() => _context.Dispose();

    [Test]
    public void ChangeOwnPasswordAsync_WrongCurrentPassword_ThrowsInvalidOperationException()
    {
        var dto = new ChangePasswordDto { CurrentPassword = "WrongPassword", NewPassword = "New@12345", ConfirmNewPassword = "New@12345" };

        Assert.ThrowsAsync<InvalidOperationException>(() => _service.ChangeOwnPasswordAsync(_user.Id, dto));
    }

    [Test]
    public void ChangeOwnPasswordAsync_NewPasswordSameAsCurrent_ThrowsInvalidOperationException()
    {
        var dto = new ChangePasswordDto { CurrentPassword = "Current@123", NewPassword = "Current@123", ConfirmNewPassword = "Current@123" };

        Assert.ThrowsAsync<InvalidOperationException>(() => _service.ChangeOwnPasswordAsync(_user.Id, dto));
    }

    [Test]
    public async Task UploadProfilePhotoAsync_ReplacesExistingPhotoAndDeletesOldFile()
    {
        var firstUrl = await _service.UploadProfilePhotoAsync(_user.Id, FakeFormFile());
        var secondUrl = await _service.UploadProfilePhotoAsync(_user.Id, FakeFormFile());

        Assert.That(secondUrl, Is.Not.EqualTo(firstUrl));
        Assert.That(_fileUploadService.LastDeletedUrl, Is.EqualTo(firstUrl));

        var user = await _context.Users.FindAsync(_user.Id);
        Assert.That(user!.ProfilePhotoUrl, Is.EqualTo(secondUrl));
        Assert.That(user.ProfilePhotoData, Is.Not.Null.And.Not.Empty);
        Assert.That(user.ProfilePhotoContentType, Is.EqualTo("image/jpeg"));
    }

    [Test]
    public async Task GetOwnProfilePhotoAsync_NoPhotoUploaded_ReturnsNull()
    {
        var result = await _service.GetOwnProfilePhotoAsync(_user.Id);
        Assert.That(result, Is.Null);
    }

    [Test]
    public async Task GetOwnProfilePhotoAsync_AfterUpload_ReturnsStoredBytesAndContentType()
    {
        await _service.UploadProfilePhotoAsync(_user.Id, FakeFormFile());

        var result = await _service.GetOwnProfilePhotoAsync(_user.Id);

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.Value.Data, Is.Not.Empty);
        Assert.That(result.Value.ContentType, Is.EqualTo("image/jpeg"));
    }

    private static Microsoft.AspNetCore.Http.IFormFile FakeFormFile()
    {
        var stream = new System.IO.MemoryStream(new byte[] { 1, 2, 3 });
        return new Microsoft.AspNetCore.Http.FormFile(stream, 0, stream.Length, "File", "photo.png");
    }
}
