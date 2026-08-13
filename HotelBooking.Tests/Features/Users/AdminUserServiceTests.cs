using System;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Users.DTOs;
using HotelBooking.API.Users.Models;
using HotelBooking.API.Users.Services;
using NUnit.Framework;

namespace HotelBooking.Tests.Features.Users;

[TestFixture]
public class AdminUserServiceTests
{
    private ApplicationDbContext _context = null!;
    private AdminUserService _service = null!;

    [SetUp]
    public void SetUp()
    {
        _context = TestDbContextFactory.Create();
        _service = new AdminUserService(_context, new FakeAuditLogService());

        _context.Roles.Add(new Role { Id = 1, Name = "Admin" });
        _context.Roles.Add(new Role { Id = 2, Name = "Customer" });
        _context.SaveChanges();
    }

    [TearDown]
    public void TearDown() => _context.Dispose();

    private static CreateUserDto ValidDto(string email = "newuser@hbs.local", string phone = "9876511111") => new()
    {
        FirstName = "New", LastName = "User", Email = email, Phone = phone,
        Password = "NewUser@123", RoleId = 2, Status = "Active"
    };

    [Test]
    public async Task CreateUserAsync_Valid_GeneratesUserCustomIdWithCorrectRolePrefix()
    {
        // QA Defect (Medium) regression: admin-created users used to get UserCustomId == "".
        var result = await _service.CreateUserAsync(ValidDto());

        Assert.That(result.UserCustomId, Does.StartWith("CUST-"));
        Assert.That(result.UserCustomId, Is.Not.Empty);
    }

    [Test]
    public async Task CreateUserAsync_AdminRole_GeneratesAdmPrefixedCustomId()
    {
        var dto = ValidDto();
        dto.RoleId = 1;

        var result = await _service.CreateUserAsync(dto);

        Assert.That(result.UserCustomId, Does.StartWith("ADM-"));
    }

    [Test]
    public async Task CreateUserAsync_DuplicateEmail_ThrowsInvalidOperationExceptionInsteadOfRaw500()
    {
        // QA Defect (High) regression: this used to hit the DB's unique-constraint and surface as
        // an unhandled 500 ("...See the inner exception for details.").
        await _service.CreateUserAsync(ValidDto());

        var duplicate = ValidDto(phone: "9876522222"); // same email, different phone
        var ex = Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateUserAsync(duplicate));
        Assert.That(ex!.Message, Does.Contain("already registered"));
    }

    [Test]
    public async Task CreateUserAsync_DuplicatePhone_ThrowsInvalidOperationException()
    {
        await _service.CreateUserAsync(ValidDto());

        var duplicate = ValidDto(email: "different@hbs.local"); // same phone, different email
        Assert.ThrowsAsync<InvalidOperationException>(() => _service.CreateUserAsync(duplicate));
    }

    [Test]
    public void CreateUserAsync_InvalidRoleId_ThrowsArgumentExceptionInsteadOfRaw500()
    {
        // QA Defect (High) regression: an invalid RoleId used to violate the FK constraint and
        // surface as an unhandled 500.
        var dto = ValidDto();
        dto.RoleId = 999;

        Assert.ThrowsAsync<ArgumentException>(() => _service.CreateUserAsync(dto));
    }

    [Test]
    public async Task UpdateUserAsync_EmailCollidesWithAnotherUser_ThrowsInvalidOperationException()
    {
        var first = await _service.CreateUserAsync(ValidDto());
        var second = await _service.CreateUserAsync(ValidDto(email: "second@hbs.local", phone: "9876533333"));

        var dto = new UpdateUserDto
        {
            FirstName = "Second", LastName = "User", Email = first.Email, // collides with `first`
            Phone = "9876533333", RoleId = 2, Status = "Active"
        };

        Assert.ThrowsAsync<InvalidOperationException>(() => _service.UpdateUserAsync(second.Id, dto));
    }

    [Test]
    public void UpdateUserAsync_InvalidRoleId_ThrowsArgumentException()
    {
        Assert.ThrowsAsync<ArgumentException>(async () =>
        {
            var created = await _service.CreateUserAsync(ValidDto());
            var dto = new UpdateUserDto
            {
                FirstName = created.FirstName, LastName = created.LastName, Email = created.Email,
                Phone = "9876511111", RoleId = 999, Status = "Active"
            };
            await _service.UpdateUserAsync(created.Id, dto);
        });
    }
}
