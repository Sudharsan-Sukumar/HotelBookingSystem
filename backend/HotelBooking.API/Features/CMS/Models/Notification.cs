using System;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using HotelBooking.API.Users.Models;

namespace HotelBooking.API.Features.CMS.Models;

[Table("Notifications", Schema = "hotel")]
public class Notification
{
    public int Id { get; set; }
    public int UserId { get; set; }

    // QA Defect (Critical): this navigation was being serialized whole into API responses —
    // including the owning User's PasswordHash, tokens, wallet balance, and saved cards — whenever
    // EF's relationship fixup happened to wire it up from an already-tracked User elsewhere in the
    // same request (e.g. the JWT auth pipeline's own user lookup). [JsonIgnore] makes this
    // impossible for every current and future consumer of this entity, not just one endpoint.
    [JsonIgnore]
    public User User { get; set; } = null!;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
