using System.Threading.Tasks;
using HotelBooking.API.Users.DTOs;

namespace HotelBooking.API.Users.Services;

public interface IProfileService
{
    Task<UserDto?> GetOwnProfileAsync(int userId);
    Task<UserDto> UpdateOwnProfileAsync(int userId, ProfileUpdateDto dto);
    Task ChangeOwnPasswordAsync(int userId, ChangePasswordDto dto);
    Task<string> UploadProfilePhotoAsync(int userId, Microsoft.AspNetCore.Http.IFormFile file);
    Task<(byte[] Data, string ContentType)?> GetOwnProfilePhotoAsync(int userId);
}
