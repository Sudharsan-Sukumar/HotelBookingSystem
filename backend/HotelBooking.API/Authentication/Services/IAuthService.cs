using System.Threading.Tasks;
using HotelBooking.API.Authentication.DTOs;

namespace HotelBooking.API.Authentication.Services;

public interface IAuthService
{
    Task<AuthResponseDto?> LoginAsync(LoginDto dto);
    Task<AuthResponseDto?> RegisterAsync(RegisterDto dto);
    Task<bool> VerifyEmailAsync(VerifyEmailDto dto);
    Task<bool> ResendVerificationEmailAsync(ResendVerificationDto dto);
    Task<bool> ForgotPasswordAsync(ForgotPasswordDto dto);
    Task<bool> ResetPasswordAsync(ResetPasswordDto dto);
    Task LogoutAllDevicesAsync(int userId, string? currentAccessTokenJti = null);
    Task<AuthResponseDto?> RefreshTokenAsync(RefreshTokenDto dto);
    Task LogoutAsync(LogoutDto dto);
    Task<AuthResponseDto> GoogleLoginAsync(GoogleAuthDto dto);
}
