using System;
using System.Security.Claims;
using System.Threading.Tasks;
using HotelBooking.API.Authentication.DTOs;
using HotelBooking.API.Authentication.Services;
using HotelBooking.API.Common.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Hosting;

namespace HotelBooking.API.Authentication.Controllers;

[ApiController]
[Route("api/auth")]
[ApiExplorerSettings(GroupName = "Customer")]
public class AuthController : ControllerBase
{
    // Kept in sync with AuthService.AccessTokenLifetime so the cookie never outlives the JWT it carries.
    private const string AccessTokenCookieName = "access_token";

    private readonly IAuthService _authService;
    private readonly IHostEnvironment _environment;

    public AuthController(IAuthService authService, IHostEnvironment environment)
    {
        _authService = authService;
        _environment = environment;
    }

    // The token is still returned in the response body too (Swagger's Authorize button and the
    // existing localStorage-based frontend both depend on that) — the cookie is an additional,
    // JS-inaccessible channel for same-origin browser requests, not a replacement for the body.
    private void SetAccessTokenCookie(string token)
    {
        Response.Cookies.Append(AccessTokenCookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = !_environment.IsDevelopment(),
            SameSite = SameSiteMode.Lax,
            Path = "/",
            Expires = DateTimeOffset.UtcNow.Add(AuthService.AccessTokenLifetime)
        });
    }

    private void ClearAccessTokenCookie()
    {
        Response.Cookies.Delete(AccessTokenCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = !_environment.IsDevelopment(),
            SameSite = SameSiteMode.Lax,
            Path = "/"
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto dto)
    {
        try
        {
            var response = await _authService.LoginAsync(dto);
            if (response == null)
                return Unauthorized(ApiResponse<object?>.ErrorResponse("Invalid email or password."));

            SetAccessTokenCookie(response.Token);
            return Ok(ApiResponse<AuthResponseDto>.SuccessResponse(response));
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(423, ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto dto)
    {
        var response = await _authService.RegisterAsync(dto);
        if (response == null)
            return BadRequest(ApiResponse<object?>.ErrorResponse("Email is already registered."));

        return Ok(ApiResponse<AuthResponseDto>.SuccessResponse(response));
    }

    [HttpPost("verify-email")]
    public async Task<ActionResult> VerifyEmail([FromBody] VerifyEmailDto dto)
    {
        var success = await _authService.VerifyEmailAsync(dto);
        if (!success)
            return BadRequest(ApiResponse<object?>.ErrorResponse("Verification link expired or invalid. Please request a new one."));

        return Ok(ApiResponse.SuccessResponse("Email verified successfully."));
    }

    [HttpPost("resend-verification")]
    public async Task<ActionResult> ResendVerificationEmail([FromBody] ResendVerificationDto dto)
    {
        await _authService.ResendVerificationEmailAsync(dto);
        // Always return Ok to prevent email enumeration
        return Ok(ApiResponse.SuccessResponse("If the email is registered and pending, a new verification OTP has been sent."));
    }

    [HttpPost("forgot-password")]
    public async Task<ActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        await _authService.ForgotPasswordAsync(dto);
        // Always return Ok to prevent email enumeration
        return Ok(ApiResponse.SuccessResponse("If the email is registered, a password reset OTP has been sent."));
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        try
        {
            var success = await _authService.ResetPasswordAsync(dto);
            if (!success)
                return BadRequest(ApiResponse<object?>.ErrorResponse("Reset OTP is invalid or has expired. Please request a new one."));

            return Ok(ApiResponse.SuccessResponse("Password reset successfully. Please log in with your new password."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object?>.ErrorResponse(ex.Message));
        }
    }

    [HttpPost("logout-all-devices")]
    [Authorize]
    public async Task<ActionResult> LogoutAllDevices()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "0");
        var currentJti = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti);
        await _authService.LogoutAllDevicesAsync(userId, currentJti);
        ClearAccessTokenCookie();
        return Ok(ApiResponse.SuccessResponse("Logged out from all devices. Please log in again."));
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponseDto>> Refresh([FromBody] RefreshTokenDto dto)
    {
        var response = await _authService.RefreshTokenAsync(dto);
        if (response == null)
            return Unauthorized(ApiResponse<object?>.ErrorResponse("Refresh token is invalid, revoked, or expired. Please log in again."));

        SetAccessTokenCookie(response.Token);
        return Ok(ApiResponse<AuthResponseDto>.SuccessResponse(response));
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<ActionResult> Logout([FromBody] LogoutDto dto)
    {
        dto.AccessTokenJti = User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti);
        await _authService.LogoutAsync(dto);
        ClearAccessTokenCookie();
        return Ok(ApiResponse.SuccessResponse("Logged out."));
    }
}
