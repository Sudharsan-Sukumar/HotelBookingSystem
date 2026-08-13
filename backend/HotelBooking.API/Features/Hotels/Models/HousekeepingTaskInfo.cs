using System;

namespace HotelBooking.API.Features.Hotels.Models;

// Owned JSON element stored inside Hotel.Housekeeping — replaces the former standalone
// HousekeepingTasks table. No service currently reads or writes this (it had zero consumers
// before this migration too); the structure is preserved as-is per the requested schema change.
public class HousekeepingTaskInfo
{
    public int Id { get; set; }
    public int RoomId { get; set; }
    public int AssignedTo { get; set; }
    public string TaskDescription { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending"; // Pending, InProgress, Completed
    public DateTime DueDate { get; set; }
}
