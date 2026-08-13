using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Features.Hotels.DTOs;
using HotelBooking.API.Features.Hotels.Models;

namespace HotelBooking.API.Features.Hotels.Services;

public interface IGalleryService
{
    Task<HotelImageInfo> UploadHotelImageAsync(ImageUploadDto request, int callerId, bool isAdmin);
    Task<IEnumerable<HotelImageInfo>> GetHotelImagesAsync(int hotelId);
    Task<(byte[] Data, string ContentType)?> GetHotelImageContentAsync(int imageId);
    Task DeleteHotelImageAsync(int imageId, int callerId, bool isAdmin);
    
    Task<RoomTypeImage> UploadRoomTypeImageAsync(ImageUploadDto request);
    Task<IEnumerable<RoomTypeImage>> GetRoomTypeImagesAsync(int roomTypeId);
    Task DeleteRoomTypeImageAsync(int imageId);
}
