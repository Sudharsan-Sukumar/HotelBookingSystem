using System.Security.Claims;
using System.Threading.Tasks;
using HotelBooking.API.Authentication.Models;
using HotelBooking.API.Authorization.Services;
using HotelBooking.API.Users.Models;
using NUnit.Framework;

namespace HotelBooking.Tests.Features.Authorization;

[TestFixture]
public class AuthorizationTests
{
    private HotelBooking.API.Data.ApplicationDbContext _context = null!;
    private TokenAuthorizationService _service = null!;
    private User _user = null!;

    [SetUp]
    public void SetUp()
    {
        _context = TestDbContextFactory.Create();

        _context.Roles.Add(new Role { Id = 2, Name = "Customer" });
        _user = new User
        {
            FirstName = "Test",
            LastName = "User",
            Email = "test@hbs.local",
            Phone = "9876543210",
            PasswordHash = "irrelevant",
            RoleId = 2,
            Status = "Active"
        };
        _context.Users.Add(_user);
        _context.SaveChanges();

        _service = new TokenAuthorizationService(_context);
    }

    [TearDown]
    public void TearDown() => _context.Dispose();

    private ClaimsPrincipal BuildPrincipal(string jti, long? iatUnix = null)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, _user.Id.ToString()),
            new Claim(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti, jti),
            new Claim("iat", (iatUnix ?? 0).ToString())
        };
        return new ClaimsPrincipal(new ClaimsIdentity(claims));
    }

    [Test]
    public async Task GetDenialReasonAsync_RevokedJti_ReturnsDenialReason()
    {
        const string jti = "revoked-jti";
        _context.RevocationTokens.Add(new RevocationToken { Token = jti, Reason = "test" });
        await _context.SaveChangesAsync();

        var reason = await _service.GetDenialReasonAsync(BuildPrincipal(jti));

        Assert.That(reason, Is.Not.Null);
    }

    [Test]
    public async Task GetDenialReasonAsync_ValidActiveUserNotRevoked_ReturnsNull()
    {
        var reason = await _service.GetDenialReasonAsync(BuildPrincipal("fresh-jti"));

        Assert.That(reason, Is.Null);
    }

    [Test]
    public async Task GetDenialReasonAsync_SuspendedUser_ReturnsDenialReason()
    {
        _user.Status = "Suspended";
        await _context.SaveChangesAsync();

        var reason = await _service.GetDenialReasonAsync(BuildPrincipal("some-jti"));

        Assert.That(reason, Is.Not.Null);
    }
}
