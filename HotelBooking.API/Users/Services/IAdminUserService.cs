using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Users.DTOs;

namespace HotelBooking.API.Users.Services;

public interface IAdminUserService
{
    Task<IEnumerable<UserDto>> GetAllUsersAsync();
    Task<UserDto?> GetUserByIdAsync(int id);
    Task<UserDto> CreateUserAsync(CreateUserDto dto);
    Task<UserDto?> UpdateUserAsync(int id, UpdateUserDto dto);
    Task<bool> DeleteUserAsync(int id);
    Task<UserDto> CreateManagerAsync(CreateManagerDto dto);
}
