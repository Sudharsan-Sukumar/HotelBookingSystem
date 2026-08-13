using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using HotelBooking.API.Common.Services;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Hotels.DTOs;
using HotelBooking.API.Features.Hotels.Models;
using HotelBooking.API.Users.Services;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.API.Features.Hotels.Services;

public class GalleryService : IGalleryService
{
    private readonly ApplicationDbContext _context;
    private readonly IFileUploadService _fileUploadService;
    private readonly IImageCompressionService _imageCompressionService;
    private readonly IAuditLogService _auditLogService;

    public GalleryService(ApplicationDbContext context, IFileUploadService fileUploadService,
        IImageCompressionService imageCompressionService, IAuditLogService auditLogService)
    {
        _context = context;
        _fileUploadService = fileUploadService;
        _imageCompressionService = imageCompressionService;
        _auditLogService = auditLogService;
    }

    private string ComputeFileHash(Microsoft.AspNetCore.Http.IFormFile file)
    {
        using var sha256 = SHA256.Create();
        using var stream = file.OpenReadStream();
        var hashBytes = sha256.ComputeHash(stream);
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
    }

    public async Task<HotelImageInfo> UploadHotelImageAsync(ImageUploadDto request, int callerId, bool isAdmin)
    {
        var hotel = await _context.Hotels.FindAsync(request.EntityId);
        if (hotel == null)
            throw new ArgumentException("Hotel not found.");

        if (!isAdmin && !hotel.ManagerIds.Contains(callerId))
            throw new UnauthorizedAccessException("You can only manage images for your own hotel.");

        var currentImagesCount = hotel.Images.Count;
        if (currentImagesCount >= 20)
            throw new InvalidOperationException("Maximum limit of 20 images reached for this hotel.");

        // Edge Case 7: Manager uploads identical image -> File Hash check
        string fileHash = ComputeFileHash(request.File);
        bool duplicateExists = hotel.Images.Any(i => i.FileHash == fileHash);
        if (duplicateExists)
            throw new InvalidOperationException("This image has already been uploaded for this hotel.");

        // Validate + compress to <=500KB before anything touches disk or the DB — the original
        // uncompressed upload is never persisted.
        var (compressedData, contentType) = await _imageCompressionService.ValidateAndCompressAsync(request.File, maxSizeKb: 500);

        string? url = null;
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Edge Case 19: Database transaction and file cleanup
            url = await _fileUploadService.SaveImageBytesAsync(compressedData, request.File.FileName, "images");

            // Image ids must stay unique across every hotel, not just this one, since the DELETE
            // route only takes a bare image id (no hotelId) — mirrors the old table's IDENTITY column.
            var allHotels = await _context.Hotels.ToListAsync();
            int nextImageId = allHotels.SelectMany(h => h.Images).Select(i => i.Id).DefaultIfEmpty(0).Max() + 1;

            var image = new HotelImageInfo
            {
                Id = nextImageId,
                Url = url,
                Caption = request.File.FileName,
                FileHash = fileHash,
                IsPrimary = request.IsPrimary || currentImagesCount == 0,
                ImageData = compressedData,
                ContentType = contentType
            };

            if (image.IsPrimary)
            {
                foreach (var existingPrimary in hotel.Images.Where(i => i.IsPrimary))
                    existingPrimary.IsPrimary = false;
            }

            hotel.Images.Add(image);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            await _auditLogService.LogActionAsync(
                "Hotel", hotel.Id, "ImageUpload",
                $"Image '{image.Caption}' uploaded for hotel {hotel.Id} by user {callerId}.",
                callerId);

            return image;
        }
        catch
        {
            await transaction.RollbackAsync();
            if (url != null)
                _fileUploadService.DeleteImage(url);
            throw;
        }
    }

    public async Task<IEnumerable<HotelImageInfo>> GetHotelImagesAsync(int hotelId)
    {
        var hotel = await _context.Hotels.FindAsync(hotelId);
        if (hotel == null) return Enumerable.Empty<HotelImageInfo>();

        return hotel.Images
            .OrderByDescending(i => i.IsPrimary)
            .ThenByDescending(i => i.UploadedAt)
            .ToList();
    }

    public async Task<(byte[] Data, string ContentType)?> GetHotelImageContentAsync(int imageId)
    {
        var hotels = await _context.Hotels.ToListAsync();
        var image = hotels.SelectMany(h => h.Images).FirstOrDefault(i => i.Id == imageId);

        if (image?.ImageData == null || image.ImageData.Length == 0)
            return null;

        return (image.ImageData, image.ContentType ?? "image/jpeg");
    }

    public async Task DeleteHotelImageAsync(int imageId, int callerId, bool isAdmin)
    {
        var hotels = await _context.Hotels.ToListAsync();
        var hotel = hotels.FirstOrDefault(h => h.Images.Any(i => i.Id == imageId));
        var image = hotel?.Images.FirstOrDefault(i => i.Id == imageId);

        if (hotel != null && image != null)
        {
            if (!isAdmin && !hotel.ManagerIds.Contains(callerId))
                throw new UnauthorizedAccessException("You can only manage images for your own hotel.");

            // Edge Case 22: Hotel deletes the last image -> Require minimum 1 image
            if (hotel.Images.Count <= 1)
                throw new InvalidOperationException("Minimum of 1 image must be maintained for the hotel.");

            _fileUploadService.DeleteImage(image.Url);

            hotel.Images.Remove(image);
            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(
                "Hotel", hotel.Id, "ImageDelete",
                $"Image {imageId} deleted from hotel {hotel.Id} by user {callerId}.",
                callerId);
        }
    }

    public async Task<RoomTypeImage> UploadRoomTypeImageAsync(ImageUploadDto request)
    {
        var roomType = await _context.RoomTypes.FindAsync(request.EntityId);
        if (roomType == null)
            throw new ArgumentException("Room type not found.");

        var currentImagesCount = await _context.RoomTypeImages.CountAsync(i => i.RoomTypeId == request.EntityId);
        if (currentImagesCount >= 5)
            throw new InvalidOperationException("Maximum limit of 5 images reached for this room type.");

        // Edge Case 7
        string fileHash = ComputeFileHash(request.File);
        bool duplicateExists = await _context.RoomTypeImages.AnyAsync(i => i.RoomTypeId == request.EntityId && i.FileHash == fileHash);
        if (duplicateExists)
            throw new InvalidOperationException("This image has already been uploaded for this room type.");

        // Customer Edge Case #17: this used to call FileUploadService.SaveImageAsync directly, which
        // only checks the file extension string — a renamed .exe would pass. Route through the same
        // decode-validating compression service the hotel-image path already uses.
        var (compressedData, _) = await _imageCompressionService.ValidateAndCompressAsync(request.File, maxSizeKb: 500);

        string? url = null;
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            url = await _fileUploadService.SaveImageBytesAsync(compressedData, request.File.FileName, "images");

            var image = new RoomTypeImage
            {
                RoomTypeId = request.EntityId,
                Url = url,
                FileHash = fileHash
            };

            _context.RoomTypeImages.Add(image);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            await _auditLogService.LogActionAsync(
                "RoomType", request.EntityId, "ImageUpload",
                $"Image uploaded for room type {request.EntityId}.",
                null);

            return image;
        }
        catch
        {
            await transaction.RollbackAsync();
            if (url != null)
                _fileUploadService.DeleteImage(url);
            throw;
        }
    }

    public async Task<IEnumerable<RoomTypeImage>> GetRoomTypeImagesAsync(int roomTypeId)
    {
        return await _context.RoomTypeImages
            .Where(i => i.RoomTypeId == roomTypeId)
            .OrderByDescending(i => i.UploadedAt)
            .ToListAsync();
    }

    public async Task DeleteRoomTypeImageAsync(int imageId)
    {
        var image = await _context.RoomTypeImages.FindAsync(imageId);
        if (image != null)
        {
            // Admin Edge Case #19: the hotel-image path already enforces "minimum 1 image" — this
            // path had no equivalent, so a room type's gallery could be deleted down to zero.
            var remainingCount = await _context.RoomTypeImages.CountAsync(i => i.RoomTypeId == image.RoomTypeId);
            if (remainingCount <= 1)
                throw new InvalidOperationException("Minimum of 1 image must be maintained for the room type.");

            _fileUploadService.DeleteImage(image.Url);

            var roomTypeId = image.RoomTypeId;
            _context.RoomTypeImages.Remove(image);
            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(
                "RoomType", roomTypeId, "ImageDelete",
                $"Image {imageId} deleted from room type {roomTypeId}.",
                null);
        }
    }
}
