using System.Text.Json;
using HotelBooking.API.Features.CMS.Models;
using HotelBooking.API.Users.Models;
using NUnit.Framework;

namespace HotelBooking.Tests.Features.CMS;

[TestFixture]
public class NotificationSerializationTests
{
    [Test]
    public void Notification_SerializedToJson_NeverIncludesTheUserNavigationOrPasswordHash()
    {
        // QA Defect (Critical) regression: GET /api/Notifications/my used to return the FULL User
        // entity nested in every notification (via EF relationship fixup from an already-tracked
        // User elsewhere in the same request) — including PasswordHash, tokens, wallet balance, and
        // saved cards. [JsonIgnore] on Notification.User must make this structurally impossible,
        // regardless of whether the navigation happens to be populated at serialization time.
        var notification = new Notification
        {
            Id = 1,
            UserId = 44,
            Message = "Your booking is confirmed.",
            Type = "BookingConfirmed",
            IsRead = false,
            // Simulate the exact leak scenario: the navigation IS populated (as it would be via
            // EF's relationship fixup) with a real, sensitive User graph.
            User = new User
            {
                Id = 44,
                FirstName = "QA",
                LastName = "Tester",
                Email = "qa@hbs.local",
                PasswordHash = "$2a$12$SuperSecretBcryptHashThatMustNeverLeak",
                VerificationToken = "123456",
                PasswordResetToken = "654321",
                WalletBalance = 9999,
                Phone = "9999999999"
            }
        };

        var json = JsonSerializer.Serialize(notification, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });

        Assert.That(json, Does.Not.Contain("passwordHash"));
        Assert.That(json, Does.Not.Contain("SuperSecretBcryptHash"));
        Assert.That(json, Does.Not.Contain("verificationToken"));
        Assert.That(json, Does.Not.Contain("passwordResetToken"));
        Assert.That(json, Does.Not.Contain("walletBalance"));
        Assert.That(json, Does.Not.Contain("\"user\""));

        // The actual notification fields must still be present — this isn't a blanket lockdown.
        Assert.That(json, Does.Contain("\"message\""));
        Assert.That(json, Does.Contain("BookingConfirmed"));
    }
}
