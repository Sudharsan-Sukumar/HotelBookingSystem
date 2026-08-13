using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Users.Models;

namespace HotelBooking.API.Users.Services;

public interface IRoleService
{
    Task<IEnumerable<Role>> GetAllRolesAsync();
    Task<Role> CreateRoleAsync(string name, int adminId);
    Task<bool> DeleteRoleAsync(int id, int adminId);
}
