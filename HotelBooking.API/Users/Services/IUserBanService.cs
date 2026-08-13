using System.Threading.Tasks;

namespace HotelBooking.API.Users.Services;

public interface IUserBanService
{
    Task<bool> BanUserAsync(int userId, string reason, int adminId);
    Task<bool> UnbanUserAsync(int userId, string reason, int adminId);
}
