using System;

namespace HotelBooking.API.Features.Reports.DTOs;

public class CustomerActivityReportDto
{
    public string CustomerCustomId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime RegistrationDate { get; set; }
    public int TotalBookings { get; set; }
    public decimal TotalSpend { get; set; }
    public int Cancellations { get; set; }
    public int ReviewsSubmitted { get; set; } // Mocked as 0 for now
}
