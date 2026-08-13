using System;

namespace HotelBooking.API.Features.Reports.DTOs;

public class CustomerTransactionReportDto
{
    public string TransactionId { get; set; } = string.Empty;
    public string BookingCustomId { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public decimal WalletAmountUsed { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime PaymentDate { get; set; }
    public string Type { get; set; } = string.Empty; // e.g. "Payment", "Refund"
}
