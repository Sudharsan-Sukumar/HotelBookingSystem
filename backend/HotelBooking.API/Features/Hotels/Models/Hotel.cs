using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using HotelBooking.API.Users.Models;

namespace HotelBooking.API.Features.Hotels.Models;

[Table("Hotels", Schema = "hotel")]
public class Hotel
{
    public int Id { get; set; }
    public string HotelCustomId { get; set; } = string.Empty; // HTL-YYYY-NNNN
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string ZipCode { get; set; } = string.Empty;
    public int StarRating { get; set; } // 1 to 5, admin-assigned classification rating
    public decimal AverageRating { get; set; } = 0; // customer review average, separate from StarRating
    public int ReviewCount { get; set; } = 0;
    public string ThumbnailUrl { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Replaces the former HotelImages table (JSON column, owned collection).
    public List<HotelImageInfo> Images { get; set; } = new();

    // Replaces the former Amenities/HotelAmenities tables (JSON column of amenity names).
    public List<string> Amenities { get; set; } = new();

    // Replaces the former HotelManagers table (JSON column of User.Id values).
    public List<int> ManagerIds { get; set; } = new();

    // Replaces the former HousekeepingTasks table (JSON column, owned collection).
    public List<HousekeepingTaskInfo> Housekeeping { get; set; } = new();

    [Timestamp]
    public byte[] RowVersion { get; set; } = null!;
}
