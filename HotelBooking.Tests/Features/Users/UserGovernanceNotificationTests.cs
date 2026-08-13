using System;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Users.Models;
using HotelBooking.API.Users.Services;
using NUnit.Framework;

namespace HotelBooking.Tests.Features.Users;

[TestFixture]
public class UserGovernanceNotificationTests
{
    private ApplicationDbContext _context = null!;
    private FakeNotificationQueue _notificationQueue = null!;
    private ApprovalWorkflowService _approvalService = null!;
    private UserBanService _banService = null!;
    private User _manager = null!;

    [SetUp]
    public void SetUp()
    {
        _context = TestDbContextFactory.Create();
        _notificationQueue = new FakeNotificationQueue();
        _approvalService = new ApprovalWorkflowService(_context, new FakeAuditLogService(), _notificationQueue);
        _banService = new UserBanService(_context, new FakeAuditLogService(), _notificationQueue);

        _context.Roles.Add(new Role { Id = 3, Name = "Manager" });
        _manager = new User
        {
            FirstName = "Pending",
            LastName = "Manager",
            Email = "pendingmgr@hbs.local",
            Phone = "9876511111",
            PasswordHash = "irrelevant",
            RoleId = 3,
            Status = "Pending"
        };
        _context.Users.Add(_manager);
        _context.SaveChanges();
    }

    [TearDown]
    public void TearDown() => _context.Dispose();

    [Test]
    public async Task ApproveManagerAsync_QueuesApprovalNotificationToTheManager()
    {
        var result = await _approvalService.ApproveManagerAsync(_manager.Id, adminId: 1);

        Assert.That(result, Is.True);
        Assert.That(_notificationQueue.Queued, Has.Count.EqualTo(1));
        Assert.That(_notificationQueue.Queued[0].UserId, Is.EqualTo(_manager.Id));
        Assert.That(_notificationQueue.Queued[0].Type, Is.EqualTo("AccountApproved"));
    }

    [Test]
    public async Task RejectManagerAsync_QueuesRejectionNotificationToTheManager()
    {
        var result = await _approvalService.RejectManagerAsync(_manager.Id, adminId: 1);

        Assert.That(result, Is.True);
        Assert.That(_notificationQueue.Queued, Has.Count.EqualTo(1));
        Assert.That(_notificationQueue.Queued[0].Type, Is.EqualTo("AccountRejected"));
    }

    [Test]
    public async Task BanUserAsync_QueuesSuspensionNotification()
    {
        _manager.Status = "Active";
        await _context.SaveChangesAsync();

        var result = await _banService.BanUserAsync(_manager.Id, "Policy violation", adminId: 1);

        Assert.That(result, Is.True);
        Assert.That(_notificationQueue.Queued, Has.Count.EqualTo(1));
        Assert.That(_notificationQueue.Queued[0].Type, Is.EqualTo("AccountSuspended"));
        Assert.That(_notificationQueue.Queued[0].Message, Does.Contain("Policy violation"));
    }

    [Test]
    public async Task UnbanUserAsync_QueuesReinstatementNotification()
    {
        _manager.Status = "Suspended";
        await _context.SaveChangesAsync();

        var result = await _banService.UnbanUserAsync(_manager.Id, "Appeal accepted", adminId: 1);

        Assert.That(result, Is.True);
        Assert.That(_notificationQueue.Queued, Has.Count.EqualTo(1));
        Assert.That(_notificationQueue.Queued[0].Type, Is.EqualTo("AccountReinstated"));
    }
}
