using System.Linq;
using System.Threading.Tasks;
using HotelBooking.API.Authentication.DTOs;
using HotelBooking.API.Authentication.Services;
using HotelBooking.API.Users.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using NUnit.Framework;

namespace HotelBooking.Tests.Features.Authentication;

[TestFixture]
public class AuthenticationTests
{
    private HotelBooking.API.Data.ApplicationDbContext _context = null!;
    private AuthService _service = null!;

    [SetUp]
    public void SetUp()
    {
        _context = TestDbContextFactory.Create();

        _context.Roles.Add(new Role { Id = 2, Name = "Customer" });
        _context.Users.Add(new User
        {
            FirstName = "Existing",
            LastName = "User",
            Email = "existing@hbs.local",
            Phone = "9876543210",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Correct@123", workFactor: 4),
            RoleId = 2,
            Status = "Active"
        });
        _context.SaveChanges();

        var configuration = new ConfigurationBuilder().Build();
        _service = new AuthService(_context, configuration, new FakeEmailQueue(), NullLogger<AuthService>.Instance);
    }

    [TearDown]
    public void TearDown() => _context.Dispose();

    [Test]
    public async Task RegisterAsync_DuplicateEmail_ReturnsNull()
    {
        var dto = new RegisterDto
        {
            FirstName = "New",
            LastName = "User",
            Email = "existing@hbs.local",
            Phone = "9876500000",
            Password = "SomePassword@1",
            DateOfBirth = new System.DateOnly(2000, 1, 1)
        };

        var result = await _service.RegisterAsync(dto);

        Assert.That(result, Is.Null);
    }

    [Test]
    public async Task LoginAsync_WrongPassword_ReturnsNullAndIncrementsFailedAttempts()
    {
        var dto = new LoginDto { Email = "existing@hbs.local", Password = "WrongPassword" };

        var result = await _service.LoginAsync(dto);

        Assert.That(result, Is.Null);
        var user = await _context.Users.FindAsync(1);
        Assert.That(user!.FailedLoginAttempts, Is.EqualTo(1));
    }

    [Test]
    public async Task LoginAsync_ValidCredentials_ReturnsTokenAndRefreshToken()
    {
        var dto = new LoginDto { Email = "existing@hbs.local", Password = "Correct@123" };

        var result = await _service.LoginAsync(dto);

        Assert.That(result, Is.Not.Null);
        Assert.That(result!.Token, Is.Not.Empty);
        Assert.That(result.RefreshToken, Is.Not.Empty);
    }

    [Test]
    public async Task ForgotPasswordAsync_ExistingUser_GeneratesSixDigitOtpUsingSameFieldsAsEmailVerification()
    {
        var result = await _service.ForgotPasswordAsync(new ForgotPasswordDto { Email = "existing@hbs.local" });

        Assert.That(result, Is.True);

        var user = await _context.Users.FirstAsync(u => u.Email == "existing@hbs.local");
        Assert.That(user.PasswordResetToken, Is.Not.Null.And.Matches(@"^\d{6}$"));
        Assert.That(user.PasswordResetTokenExpiry, Is.Not.Null);
        Assert.That(user.PasswordResetTokenExpiry!.Value, Is.GreaterThan(System.DateTime.UtcNow));
    }

    [Test]
    public async Task ForgotPasswordAsync_UnknownEmail_ReturnsFalseWithoutRevealingWhichEmailsExist()
    {
        var result = await _service.ForgotPasswordAsync(new ForgotPasswordDto { Email = "nobody@hbs.local" });

        Assert.That(result, Is.False);
    }

    [Test]
    public async Task ResetPasswordAsync_FullFlow_OtpThenNewPasswordThenLoginWithNewPassword()
    {
        // Forgot Password -> Email -> 6-digit OTP
        await _service.ForgotPasswordAsync(new ForgotPasswordDto { Email = "existing@hbs.local" });
        var user = await _context.Users.FirstAsync(u => u.Email == "existing@hbs.local");
        var otp = user.PasswordResetToken!;

        // OTP Verification -> Reset Password
        var resetDto = new ResetPasswordDto
        {
            Email = "existing@hbs.local",
            Token = otp,
            OldPassword = "Correct@123",
            NewPassword = "BrandNew@456",
            ConfirmNewPassword = "BrandNew@456"
        };
        var resetResult = await _service.ResetPasswordAsync(resetDto);
        Assert.That(resetResult, Is.True);

        var reloaded = await _context.Users.FirstAsync(u => u.Email == "existing@hbs.local");
        Assert.That(reloaded.PasswordResetToken, Is.Null);       // OTP consumed
        Assert.That(reloaded.PasswordResetTokenExpiry, Is.Null);

        // Login with New Password
        var loginResult = await _service.LoginAsync(new LoginDto { Email = "existing@hbs.local", Password = "BrandNew@456" });
        Assert.That(loginResult, Is.Not.Null);

        // Old password no longer works
        var oldLoginResult = await _service.LoginAsync(new LoginDto { Email = "existing@hbs.local", Password = "Correct@123" });
        Assert.That(oldLoginResult, Is.Null);
    }

    [Test]
    public async Task ResetPasswordAsync_WrongOtp_ReturnsFalse()
    {
        await _service.ForgotPasswordAsync(new ForgotPasswordDto { Email = "existing@hbs.local" });

        var result = await _service.ResetPasswordAsync(new ResetPasswordDto
        {
            Email = "existing@hbs.local",
            Token = "000000",
            OldPassword = "Correct@123",
            NewPassword = "BrandNew@456",
            ConfirmNewPassword = "BrandNew@456"
        });

        Assert.That(result, Is.False);
    }

    [Test]
    public async Task ResetPasswordAsync_ExpiredOtp_ReturnsFalse()
    {
        await _service.ForgotPasswordAsync(new ForgotPasswordDto { Email = "existing@hbs.local" });
        var user = await _context.Users.FirstAsync(u => u.Email == "existing@hbs.local");
        var otp = user.PasswordResetToken!;
        user.PasswordResetTokenExpiry = System.DateTime.UtcNow.AddMinutes(-1); // simulate expiry
        await _context.SaveChangesAsync();

        var result = await _service.ResetPasswordAsync(new ResetPasswordDto
        {
            Email = "existing@hbs.local",
            Token = otp,
            OldPassword = "Correct@123",
            NewPassword = "BrandNew@456",
            ConfirmNewPassword = "BrandNew@456"
        });

        Assert.That(result, Is.False);
    }

    [Test]
    public async Task ResetPasswordAsync_WrongOldPassword_ThrowsInvalidOperationException()
    {
        await _service.ForgotPasswordAsync(new ForgotPasswordDto { Email = "existing@hbs.local" });
        var user = await _context.Users.FirstAsync(u => u.Email == "existing@hbs.local");
        var otp = user.PasswordResetToken!;

        var dto = new ResetPasswordDto
        {
            Email = "existing@hbs.local",
            Token = otp,
            OldPassword = "TotallyWrongPassword@1",
            NewPassword = "BrandNew@456",
            ConfirmNewPassword = "BrandNew@456"
        };

        var ex = Assert.ThrowsAsync<System.InvalidOperationException>(() => _service.ResetPasswordAsync(dto));
        Assert.That(ex!.Message, Does.Contain("Incorrect old password"));

        // The correct OTP was NOT consumed by a failed old-password check — still usable afterward
        // with the right old password.
        var reloaded = await _context.Users.FirstAsync(u => u.Email == "existing@hbs.local");
        Assert.That(reloaded.PasswordResetToken, Is.EqualTo(otp));
    }

    [Test]
    public async Task ResetPasswordAsync_NewPasswordSameAsCurrent_ThrowsInvalidOperationException()
    {
        await _service.ForgotPasswordAsync(new ForgotPasswordDto { Email = "existing@hbs.local" });
        var user = await _context.Users.FirstAsync(u => u.Email == "existing@hbs.local");
        var otp = user.PasswordResetToken!;

        var dto = new ResetPasswordDto
        {
            Email = "existing@hbs.local",
            Token = otp,
            OldPassword = "Correct@123",
            NewPassword = "Correct@123", // same as the account's current password
            ConfirmNewPassword = "Correct@123"
        };

        Assert.ThrowsAsync<System.InvalidOperationException>(() => _service.ResetPasswordAsync(dto));
    }

    [Test]
    public void ResetPasswordDto_MismatchedConfirmPassword_FailsValidation()
    {
        var dto = new ResetPasswordDto
        {
            Email = "existing@hbs.local",
            Token = "123456",
            OldPassword = "Correct@123",
            NewPassword = "BrandNew@456",
            ConfirmNewPassword = "Different@456"
        };

        var results = new System.Collections.Generic.List<System.ComponentModel.DataAnnotations.ValidationResult>();
        var context = new System.ComponentModel.DataAnnotations.ValidationContext(dto);
        bool isValid = System.ComponentModel.DataAnnotations.Validator.TryValidateObject(dto, context, results, validateAllProperties: true);

        Assert.That(isValid, Is.False);
        Assert.That(results.Exists(r => r.MemberNames.Contains(nameof(ResetPasswordDto.ConfirmNewPassword))), Is.True);
    }

    [Test]
    public void ResetPasswordDto_NewPasswordSameAsOldPassword_FailsValidation()
    {
        var dto = new ResetPasswordDto
        {
            Email = "existing@hbs.local",
            Token = "123456",
            OldPassword = "Correct@123",
            NewPassword = "Correct@123",
            ConfirmNewPassword = "Correct@123"
        };

        var results = new System.Collections.Generic.List<System.ComponentModel.DataAnnotations.ValidationResult>();
        var context = new System.ComponentModel.DataAnnotations.ValidationContext(dto);
        bool isValid = System.ComponentModel.DataAnnotations.Validator.TryValidateObject(dto, context, results, validateAllProperties: true);

        Assert.That(isValid, Is.False);
        Assert.That(results.Exists(r => r.MemberNames.Contains(nameof(ResetPasswordDto.NewPassword))), Is.True);
    }
}

internal class FakeEmailQueue : HotelBooking.API.Common.Services.IEmailQueue
{
    public System.Threading.Tasks.ValueTask QueueEmailAsync(HotelBooking.API.Common.Services.EmailPayload payload) => default;
}
