using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Features.Payments.DTOs;

namespace HotelBooking.API.Features.Payments.Services;

public interface IRazorpayPaymentService
{
    Task<PaymentLinkResponseDto> CreatePaymentLinkAsync(int callerId, CreatePaymentLinkDto dto);
    Task<RazorpayPaymentStatusDto?> GetStatusByReferenceAsync(string reference);
    Task HandleWebhookEventAsync(string eventType, string? paymentId, string? errorDescription, string? referenceId);
    Task RetryConfirmationForPaidPaymentAsync(string reference);
    Task<IEnumerable<AdminTransactionDto>> GetAllTransactionsAsync(int? bookingId, string? status);
}
