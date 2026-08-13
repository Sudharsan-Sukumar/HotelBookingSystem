using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Bookings.Models;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Services;
using HotelBooking.API.Features.Payments.DTOs;
using HotelBooking.API.Features.Payments.Models;
using HotelBooking.API.Users.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace HotelBooking.API.Features.Payments.Services;

// Razorpay Payment Links are now the ONLY payment mechanism in the system — the old internal mock
// "PaymentService"/"ExternalPaymentGatewayClient" flow and the Razorpay Orders (Checkout widget)
// flow have both been removed. This service owns booking confirmation, wallet application, and the
// admin transaction log that used to live in the now-deleted PaymentService.
public class RazorpayPaymentService : IRazorpayPaymentService
{
    private readonly ApplicationDbContext _context;
    private readonly IRazorpayApiClient _razorpayClient;
    private readonly RazorpayOptions _options;
    private readonly INotificationQueue _notificationQueue;
    private readonly IAuditLogService _auditLogService;
    private readonly ILogger<RazorpayPaymentService> _logger;

    private const int PaymentSessionMinutes = 30;

    public RazorpayPaymentService(ApplicationDbContext context, IRazorpayApiClient razorpayClient,
        IOptions<RazorpayOptions> options, INotificationQueue notificationQueue,
        IAuditLogService auditLogService, ILogger<RazorpayPaymentService> logger)
    {
        _context = context;
        _razorpayClient = razorpayClient;
        _options = options.Value;
        _notificationQueue = notificationQueue;
        _auditLogService = auditLogService;
        _logger = logger;
    }

    private async Task NotifyUserAsync(int userId, string message, string type)
    {
        await _notificationQueue.QueueNotificationAsync(new NotificationRequestDto
        {
            UserId = userId,
            Message = message,
            Type = type
        });
    }

    public async Task<PaymentLinkResponseDto> CreatePaymentLinkAsync(int callerId, CreatePaymentLinkDto dto)
    {
        var booking = await _context.Bookings
            .Include(b => b.User)
            .FirstOrDefaultAsync(b => b.Id == dto.BookingId && b.UserId == callerId);

        if (booking == null)
            throw new ArgumentException("Booking not found.");

        if (booking.Status == "Confirmed" || booking.Status == "Cancelled")
            throw new InvalidOperationException($"Booking is already {booking.Status.ToLower()}.");

        if (booking.PaymentSessionExpiresAt.HasValue && booking.PaymentSessionExpiresAt.Value < DateTime.UtcNow)
            throw new InvalidOperationException("Payment session expired. Please go back to the booking summary and try again.");

        decimal outstanding = booking.TotalAmount - booking.WalletAmountUsed;
        decimal walletToApply = 0;

        if (dto.UseWalletBalance && booking.User.WalletBalance > 0)
        {
            walletToApply = Math.Min(booking.User.WalletBalance, outstanding);
            outstanding -= walletToApply;
        }

        if (dto.AmountToPay != outstanding)
            throw new ArgumentException($"Incorrect amount. Outstanding balance after wallet is {outstanding}.");

        // Customer Edge Cases #2/#3: a page refresh or a double Pay-Now click re-submits this same
        // request before the first attempt's Razorpay link has resolved — return the still-live link
        // already created for this booking instead of minting a second one. [Idempotent] on the
        // controller action covers clients that send an Idempotency-Key header; this covers every
        // client regardless, since it's keyed on the booking itself.
        var existingLink = await _context.RazorpayPayments
            .Where(r => r.BookingId == booking.Id && r.Status == "Created")
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync();
        if (existingLink != null)
        {
            return new PaymentLinkResponseDto
            {
                PaymentLinkId = existingLink.RazorpayPaymentLinkId ?? string.Empty,
                PaymentUrl = existingLink.PaymentLinkUrl ?? string.Empty,
                Reference = existingLink.Reference,
                Amount = existingLink.Amount,
                BookingStatus = booking.Status
            };
        }

        // Fully covered by wallet — confirm immediately, no Razorpay link needed.
        if (outstanding <= 0)
        {
            await ApplyWalletAndConfirmAsync(booking, walletToApply, dto.PaymentMethod, transactionId: $"WALLET-{DateTime.UtcNow:yyyyMMddHHmmss}-{booking.Id}");

            return new PaymentLinkResponseDto
            {
                Reference = booking.Id.ToString(),
                Amount = 0,
                PaymentUrl = string.Empty,
                PaymentLinkId = string.Empty,
                BookingStatus = booking.Status
            };
        }

        // Razorpay enforces reference_id uniqueness FOREVER, even for abandoned/expired links, so a
        // constant value like the bare booking ID breaks the moment a customer needs to retry or the
        // booking is modified. Every attempt gets its own unique reference; BookingId (not this
        // string) is the authoritative link back to the booking.
        string razorpayReference = $"{booking.Id}-{DateTime.UtcNow.Ticks}";

        long amountPaise = (long)Math.Round(outstanding * 100, MidpointRounding.AwayFromZero);
        var linkResult = await _razorpayClient.CreatePaymentLinkAsync(
            amountPaise, "INR", razorpayReference, booking.User.Phone, $"Payment for booking {booking.Id}");

        var record = new RazorpayPayment
        {
            Reference = razorpayReference,
            BookingId = booking.Id,
            PhoneNumber = booking.User.Phone,
            Amount = outstanding,
            Currency = "INR",
            RazorpayPaymentLinkId = linkResult.PaymentLinkId,
            PaymentLinkUrl = linkResult.ShortUrl,
            PaymentMethod = dto.PaymentMethod,
            WalletAmountApplied = walletToApply,
            Status = "Created"
        };

        _context.RazorpayPayments.Add(record);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Created Razorpay payment link for booking {BookingId}, reference {Reference}, amount {Amount}.",
            booking.Id, razorpayReference, outstanding);

        return new PaymentLinkResponseDto
        {
            PaymentLinkId = linkResult.PaymentLinkId,
            PaymentUrl = linkResult.ShortUrl,
            Reference = record.Reference,
            Amount = outstanding,
            BookingStatus = booking.Status
        };
    }

    public async Task<RazorpayPaymentStatusDto?> GetStatusByReferenceAsync(string reference)
    {
        var record = await _context.RazorpayPayments
            .Where(r => r.Reference == reference)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync();

        return record == null ? null : ToStatusDto(record);
    }

    public async Task HandleWebhookEventAsync(string eventType, string? paymentId, string? errorDescription, string? referenceId)
    {
        // Technical/integration-level events — console only, never AuditLogs.
        _logger.LogInformation("Processing Razorpay webhook event {EventType} for reference {ReferenceId}.", eventType, referenceId);

        if (string.IsNullOrEmpty(referenceId))
        {
            _logger.LogWarning("Razorpay webhook event {EventType} received with no reference id — ignoring.", eventType);
            return;
        }

        var record = await _context.RazorpayPayments.FirstOrDefaultAsync(r => r.Reference == referenceId);
        if (record == null)
        {
            _logger.LogWarning("Razorpay webhook event {EventType} referenced unknown Reference {ReferenceId} — nothing to reconcile.", eventType, referenceId);
            return; // Unknown reference — nothing to reconcile locally.
        }

        switch (eventType)
        {
            case "payment.captured":
            case "payment_link.paid":
                if (record.Status != "Paid")
                {
                    record.Status = "Paid";
                    record.RazorpayPaymentId = paymentId ?? record.RazorpayPaymentId;
                    record.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    await ConfirmLinkedBookingIfAnyAsync(record);
                }
                break;

            case "payment.failed":
            case "payment_link.expired":
            case "payment_link.cancelled":
                if (record.Status != "Paid")
                {
                    record.Status = "Failed";
                    record.FailureReason = errorDescription ?? "Payment failed or link expired/cancelled.";
                    record.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    if (record.BookingId.HasValue)
                    {
                        var booking = await _context.Bookings.FindAsync(record.BookingId.Value);
                        if (booking != null)
                        {
                            var bookingLabel = string.IsNullOrEmpty(booking.BookingCustomId) ? booking.Id.ToString() : booking.BookingCustomId;

                            await NotifyUserAsync(booking.UserId,
                                $"Payment for booking {bookingLabel} could not be completed: {record.FailureReason}",
                                "PaymentFailed");

                            // Business audit: a payment attempt failing is a business/financial
                            // outcome on the booking, not a technical error — recorded in AuditLogs.
                            await _auditLogService.LogActionAsync(
                                "Payment", booking.Id, "PaymentFailed",
                                $"Payment failed for booking {bookingLabel} (reference {referenceId}). Reason: {record.FailureReason}",
                                booking.UserId);
                        }
                    }
                }
                break;
        }
    }

    public async Task<IEnumerable<AdminTransactionDto>> GetAllTransactionsAsync(int? bookingId, string? status)
    {
        var query = _context.Payments.Include(p => p.Booking).AsQueryable();

        if (bookingId.HasValue)
            query = query.Where(p => p.BookingId == bookingId.Value);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(p => p.Status == status);

        return await query
            .OrderByDescending(p => p.PaymentDate)
            .Select(p => new AdminTransactionDto
            {
                Id = p.Id,
                BookingId = p.BookingId,
                BookingCustomId = p.Booking.BookingCustomId,
                Amount = p.Amount,
                PaymentMethod = p.PaymentMethod,
                TransactionId = p.TransactionId,
                Status = p.Status,
                GatewayResponse = p.GatewayResponse,
                PaymentDate = p.PaymentDate
            })
            .ToListAsync();
    }

    // Confirms the Booking this payment was created for (via the authoritative BookingId column,
    // not the Razorpay-facing Reference string), exactly the way the old internal payment flow used
    // to: generate the BookingCustomId if missing, mark Confirmed, apply the wallet amount that was
    // validated (but not yet deducted) at link-creation time, and record a Payment row for the admin
    // transaction log.
    private async Task ConfirmLinkedBookingIfAnyAsync(RazorpayPayment payment)
    {
        if (!payment.BookingId.HasValue)
            return; // Not linked to a booking — nothing to confirm.

        var booking = await _context.Bookings.Include(b => b.User).FirstOrDefaultAsync(b => b.Id == payment.BookingId.Value);

        if (booking == null)
            return; // Not linked to a booking — nothing to confirm.

        if (booking.Status == "Confirmed" || booking.Status == "Cancelled")
            return; // Already resolved — avoid double-confirming on webhook retries.

        // Customer Edge Case #22: the booking's payment session expired before this "paid" webhook
        // arrived (e.g. the customer completed a stale/late Razorpay checkout). Confirming it now
        // would honor a payment session that had already lapsed — instead, credit the wallet for
        // whatever was actually captured (auto-refund) and leave the booking's own status alone,
        // rather than silently confirming a booking whose payment window had closed.
        if (booking.PaymentSessionExpiresAt.HasValue && booking.PaymentSessionExpiresAt.Value < DateTime.UtcNow)
        {
            var totalToRefund = payment.Amount + payment.WalletAmountApplied;
            booking.User.WalletBalance += totalToRefund;
            await _context.SaveChangesAsync();

            _logger.LogWarning(
                "Razorpay payment for booking {BookingId} arrived after its PaymentSessionExpiresAt — auto-refunding {Amount} to wallet instead of confirming.",
                booking.Id, totalToRefund);

            await _auditLogService.LogActionAsync(
                "Payment", booking.Id, "PaymentAutoRefunded",
                $"Payment for booking {booking.Id} arrived after its payment session expired; {totalToRefund:C} auto-refunded to customer wallet instead of confirming the booking.",
                booking.UserId);

            await NotifyUserAsync(booking.UserId,
                $"Your payment session for booking {booking.Id} had already expired, so the payment of {totalToRefund:C} was credited to your wallet instead of confirming the booking. Please contact support if you still need this booking.",
                "PaymentSessionExpired");

            return;
        }

        await ApplyWalletAndConfirmAsync(booking, payment.WalletAmountApplied, payment.PaymentMethod ?? "Razorpay",
            transactionId: payment.RazorpayPaymentId ?? payment.RazorpayPaymentLinkId ?? payment.Reference,
            razorpayAmount: payment.Amount);
    }

    private async Task ApplyWalletAndConfirmAsync(Booking booking, decimal walletAmount, string paymentMethod, string transactionId, decimal razorpayAmount = 0)
    {
        if (walletAmount > 0)
        {
            booking.User.WalletBalance -= walletAmount;
            booking.WalletAmountUsed += walletAmount;
        }

        if (string.IsNullOrEmpty(booking.BookingCustomId))
        {
            var existingIds = await _context.Bookings
                .Where(b => b.BookingCustomId != null && b.BookingCustomId != "")
                .Select(b => b.BookingCustomId)
                .ToListAsync();
            int nextSequence = existingIds
                .Select(id => int.TryParse(id.Split('-').LastOrDefault(), out var n) ? n : 0)
                .DefaultIfEmpty(0)
                .Max() + 1;
            booking.BookingCustomId = $"BKG-{DateTime.UtcNow.Year}-{nextSequence:D6}";
        }

        booking.Status = "Confirmed";
        booking.PaymentSessionExpiresAt = null;

        _context.Payments.Add(new Payment
        {
            BookingId = booking.Id,
            Amount = razorpayAmount + walletAmount,
            PaymentMethod = paymentMethod,
            TransactionId = transactionId,
            Status = "Completed",
            GatewayResponse = "APPROVED",
            UsedWallet = walletAmount > 0
        });

        await _context.SaveChangesAsync();

        await NotifyUserAsync(booking.UserId,
            $"Payment received. Your booking {booking.BookingCustomId} is now confirmed.",
            "BookingConfirmed");

        // Business audit: money changed hands and a booking moved to Confirmed — recorded in
        // AuditLogs, distinct from the technical webhook-processing log lines above.
        await _auditLogService.LogActionAsync(
            "Payment", booking.Id, "PaymentConfirmed",
            $"Payment of {razorpayAmount + walletAmount:C} confirmed for booking {booking.BookingCustomId} via {paymentMethod} (transaction {transactionId}).",
            booking.UserId);
    }

    private static RazorpayPaymentStatusDto ToStatusDto(RazorpayPayment record) => new()
    {
        Reference = record.Reference,
        Status = record.Status,
        RazorpayPaymentId = record.RazorpayPaymentId,
        Amount = record.Amount
    };

    public static string ComputeHmacSha256Hex(string payload, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
