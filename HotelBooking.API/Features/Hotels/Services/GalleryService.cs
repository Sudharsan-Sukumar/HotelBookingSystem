using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Hotels.DTOs;
using HotelBooking.API.Features.Hotels.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace HotelBooking.API.Features.Hotels.Services;

public class GalleryService : IGalleryService
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _environment;

    public GalleryService(ApplicationDbContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    private async Task<string> SaveFileAsync(Microsoft.AspNetCore.Http.IFormFile file, int maxSizeMb = 5)
    {
        if (file == null || file.Length == 0)
            throw new ArgumentException("File is empty.");

        if (file.Length > maxSizeMb * 1024 * 1024)
            throw new ArgumentException($"File size exceeds {maxSizeMb}MB limit.");

        var ext = Path.GetExtension(file.FileName).ToLower();
        if (ext != ".jpg" && ext != ".jpeg" && ext != ".png")
            throw new ArgumentException("Invalid file format. Only JPG, JPEG, and PNG are allowed.");

        var uploadsFolder = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "images");
        if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);

        var uniqueFileName = Guid.NewGuid().ToString() + "_" + file.FileName;
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using (var fileStream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(fileStream);
        }

        return $"/images/{uniqueFileName}";
    }

    private string ComputeFileHash(Microsoft.AspNetCore.Http.IFormFile file)
    {
        using var sha256 = SHA256.Create();
        using var stream = file.OpenReadStream();
        var hashBytes = sha256.ComputeHash(stream);
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
    }

    public async Task<HotelImage> UploadHotelImageAsync(ImageUploadDto request)
    {
        var hotel = await _context.Hotels.FindAsync(request.EntityId);
        if (hotel == null)
            throw new ArgumentException("Hotel not found.");

        var currentImagesCount = await _context.HotelImages.CountAsync(i => i.HotelId == request.EntityId);
        if (currentImagesCount >= 20)
            throw new InvalidOperationException("Maximum limit of 20 images reached for this hotel.");

        // Edge Case 7: Manager uploads identical image -> File Hash check
        string fileHash = ComputeFileHash(request.File);
        bool duplicateExists = await _context.HotelImages.AnyAsync(i => i.HotelId == request.EntityId && i.FileHash == fileHash);
        if (duplicateExists)
            throw new InvalidOperationException("This image has already been uploaded for this hotel.");

        string? url = null;
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // Edge Case 19: Database transaction and file cleanup
            url = await SaveFileAsync(request.File);

            var image = new HotelImage
            {
                HotelId = request.EntityId,
                Url = url,
                Caption = request.File.FileName,
                FileHash = fileHash,
                IsPrimary = request.IsPrimary || currentImagesCount == 0
            };

            if (image.IsPrimary)
            {
                var existingPrimary = await _context.HotelImages.FirstOrDefaultAsync(i => i.HotelId == request.EntityId && i.IsPrimary);
                if (existingPrimary != null)
                    existingPrimary.IsPrimary = false;
            }

            _context.HotelImages.Add(image);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return image;
        }
        catch
        {
            await transaction.RollbackAsync();
            if (url != null)
            {
                var filePath = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), url.TrimStart('/'));
                if (File.Exists(filePath))
                    File.Delete(filePath);
            }
            throw;
        }
    }

    public async Task<IEnumerable<HotelImage>> GetHotelImagesAsync(int hotelId)
    {
        return await _context.HotelImages
            .Where(i => i.HotelId == hotelId)
            .OrderByDescending(i => i.IsPrimary)
            .ThenByDescending(i => i.UploadedAt)
            .ToListAsync();
    }

    public async Task DeleteHotelImageAsync(int imageId)
    {
        var image = await _context.HotelImages.FindAsync(imageId);
        if (image != null)
        {
            var count = await _context.HotelImages.CountAsync(i => i.HotelId == image.HotelId);
            // Edge Case 22: Hotel deletes the last image -> Require minimum 1 image
            if (count <= 1)
                throw new InvalidOperationException("Minimum of 1 image must be maintained for the hotel.");

            var filePath = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), image.Url.TrimStart('/'));
            if (File.Exists(filePath))
                File.Delete(filePath);

            _context.HotelImages.Remove(image);
            await _context.SaveChangesAsync();
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

        string? url = null;
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            url = await SaveFileAsync(request.File, maxSizeMb: 3);

            var image = new RoomTypeImage
            {
                RoomTypeId = request.EntityId,
                Url = url,
                FileHash = fileHash
            };

            _context.RoomTypeImages.Add(image);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return image;
        }
        catch
        {
            await transaction.RollbackAsync();
            if (url != null)
            {
                var filePath = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), url.TrimStart('/'));
                if (File.Exists(filePath))
                    File.Delete(filePath);
            }
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
            var filePath = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), image.Url.TrimStart('/'));
            if (File.Exists(filePath))
                File.Delete(filePath);

            _context.RoomTypeImages.Remove(image);
            await _context.SaveChangesAsync();
        }
    }
}
