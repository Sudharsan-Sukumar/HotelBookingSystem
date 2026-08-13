using System;
using System.Threading.Tasks;
using HotelBooking.API.Common.Services;
using HotelBooking.API.Data;
using HotelBooking.API.Users.DTOs;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.API.Users.Services;

public class ProfileService : IProfileService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;
    private readonly IFileUploadService _fileUploadService;
    private readonly IImageCompressionService _imageCompressionService;

    public ProfileService(ApplicationDbContext context, IAuditLogService auditLogService,
        IFileUploadService fileUploadService, IImageCompressionService imageCompressionService)
    {
        _context = context;
        _auditLogService = auditLogService;
        _fileUploadService = fileUploadService;
        _imageCompressionService = imageCompressionService;
    }

    public async Task<UserDto?> GetOwnProfileAsync(int userId)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null) return null;

        return new UserDto
        {
            Id = user.Id,
            UserCustomId = user.UserCustomId,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Phone = user.Phone,
            RoleName = user.Role != null ? user.Role.Name : string.Empty,
            Status = user.Status,
            CreatedAt = user.CreatedAt,
            ProfilePhotoUrl = user.ProfilePhotoUrl
        };
    }

    public async Task<UserDto> UpdateOwnProfileAsync(int userId, ProfileUpdateDto dto)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            throw new ArgumentException("User not found.");

        var duplicatePhone = await _context.Users
            .AnyAsync(u => u.Id != userId && u.Phone == dto.Phone);
        if (duplicatePhone)
            throw new InvalidOperationException("Phone number already in use by another account.");

        user.FirstName = dto.FirstName.Trim();
        user.LastName = dto.LastName.Trim();
        user.Phone = dto.Phone;
        user.DateOfBirth = dto.DateOfBirth;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await _auditLogService.LogActionAsync(
            "User", userId, "ProfileUpdate",
            $"Profile updated: name/phone/dateOfBirth changed by user {userId}.", userId);

        return new UserDto
        {
            Id = user.Id,
            UserCustomId = user.UserCustomId,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Phone = user.Phone,
            RoleName = user.Role != null ? user.Role.Name : string.Empty,
            Status = user.Status,
            CreatedAt = user.CreatedAt,
            ProfilePhotoUrl = user.ProfilePhotoUrl
        };
    }

    public async Task ChangeOwnPasswordAsync(int userId, ChangePasswordDto dto)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            throw new ArgumentException("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            throw new InvalidOperationException("Incorrect current password.");

        if (BCrypt.Net.BCrypt.Verify(dto.NewPassword, user.PasswordHash))
            throw new InvalidOperationException("New password must differ from the current one.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword, workFactor: 12);
        user.ForcePasswordChange = false;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _auditLogService.LogActionAsync(
            "User", userId, "PasswordChange",
            $"Password changed by user {userId}.", userId);
    }

    public async Task<string> UploadProfilePhotoAsync(int userId, Microsoft.AspNetCore.Http.IFormFile file)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            throw new ArgumentException("User not found.");

        var oldPhotoUrl = user.ProfilePhotoUrl;

        // Compress first (never store the original upload), then persist the SAME compressed bytes
        // both on disk (path in ProfilePhotoUrl) and in the database (ProfilePhotoData).
        var (compressedData, contentType) = await _imageCompressionService.ValidateAndCompressAsync(file, maxSizeKb: 500);
        var newUrl = await _fileUploadService.SaveImageBytesAsync(compressedData, file.FileName, "images/profiles");

        user.ProfilePhotoUrl = newUrl;
        user.ProfilePhotoData = compressedData;
        user.ProfilePhotoContentType = contentType;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        if (!string.IsNullOrEmpty(oldPhotoUrl))
            _fileUploadService.DeleteImage(oldPhotoUrl);

        await _auditLogService.LogActionAsync(
            "User", userId, "ProfilePhotoUpdate",
            $"Profile photo updated by user {userId}.", userId);

        return newUrl;
    }

    public async Task<(byte[] Data, string ContentType)?> GetOwnProfilePhotoAsync(int userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null || user.ProfilePhotoData == null || user.ProfilePhotoData.Length == 0)
            return null;

        return (user.ProfilePhotoData, user.ProfilePhotoContentType ?? "image/jpeg");
    }
}
