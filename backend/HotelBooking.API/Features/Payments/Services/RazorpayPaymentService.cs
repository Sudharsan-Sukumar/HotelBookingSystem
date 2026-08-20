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
    private const string IsUpiEnabledSettingKey = "IsUpiEnabled";

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

        // Renew (rather than reject) an expired session. The expiry exists to gate stale, abandoned
        // payment intents — but the customer clicking "Pay Now"/"Complete Payment" right now IS a
        // fresh expression of intent, and nothing about the deal has actually changed: the room's
        // rate was locked in at booking-creation time (BaseCost/TaxAmount/TotalAmount are fixed on
        // the row already) and the booking still counts toward room availability the entire time it
        // sits "Pending Payment"/"Pending Additional Payment" (CreateBookingAsync's own availability
        // check only excludes "Cancelled" bookings), so no new double-booking risk is introduced by
        // letting a late payment through. Previously this just threw, and since nothing anywhere else
        // in the app can extend a booking's payment session, that made an expired one permanently
        // unpayable — the customer's only options were Cancel (blocked for "Pending Additional
        // Payment") or contacting support (which, since the admin manual-payment path was removed,
        // could no longer actually do anything either).
        if (booking.PaymentSessionExpiresAt.HasValue && booking.PaymentSessionExpiresAt.Value < DateTime.UtcNow)
        {
            booking.PaymentSessionExpiresAt = DateTime.UtcNow.AddMinutes(PaymentSessionMinutes);
            // Persisted immediately (not left for whichever branch below happens to call
            // SaveChangesAsync next) because ConfirmLinkedBookingIfAnyAsync re-checks this same
            // column from a fresh query when the webhook arrives — if the renewal weren't committed
            // yet by then, a customer who pays via a pre-existing/idempotent link would come back to
            // that still-stale expiry and get auto-refunded instead of confirmed.
            await _context.SaveChangesAsync();
        }

        // Customer Edge Case #2x (split-payment fallback): a prior chunk of this same outstanding
        // balance may already have been paid via an earlier CreatePaymentLinkAsync call in this same
        // sequence (see IsPartialPayment below) — those chunks are "Paid" RazorpayPayments rows that
        // were never individually confirmed against the booking, since confirming only happens once
        // the FULL balance is collected. Subtract them here so `outstanding` always means "what's
        // still actually owed", not "what was owed before any chunk was paid".
        decimal alreadyPaidViaRazorpay = await _context.RazorpayPayments
            .Where(r => r.BookingId == booking.Id && r.Status == "Paid")
            .SumAsync(r => r.Amount);

        decimal outstanding = booking.TotalAmount - booking.WalletAmountUsed - alreadyPaidViaRazorpay;
        decimal walletToApply = 0;

        // Wallet is only offered on the FIRST chunk of a split sequence — once alreadyPaidViaRazorpay
        // is nonzero, wallet eligibility was already decided (and recorded on that first chunk's
        // WalletAmountApplied) when this sequence began.
        if (alreadyPaidViaRazorpay == 0 && dto.UseWalletBalance && booking.User.WalletBalance > 0)
        {
            walletToApply = Math.Min(booking.User.WalletBalance, outstanding);
            outstanding -= walletToApply;
        }

        // BUG-003 fix: this is a client input-validation failure, not a "resource not found" case —
        // InvalidOperationException routes to the controller's existing 400 BadRequest catch clause
        // (the same one used for the sibling "already confirmed"/"session expired" checks above),
        // instead of ArgumentException's 404 NotFound mapping.
        if (dto.AmountToPay != outstanding)
            throw new InvalidOperationException($"Incorrect amount. Outstanding balance after wallet is {outstanding}.");

        // Customer Edge Cases #2/#3: a page refresh or a double Pay-Now click re-submits this same
        // request before the first attempt's Razorpay link has resolved — return the still-live link
        // already created for this booking instead of minting a second one. [Idempotent] on the
        // controller action covers clients that send an Idempotency-Key header; this covers every
        // client regardless, since it's keyed on the booking itself.
        // Idempotency Check — returns the still-live "Created" payment link instead of minting a duplicate on refresh/double-click.
        var existingLink = await _context.RazorpayPayments
            .Where(r => r.BookingId == booking.Id && r.Status == "Created")
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync();
        if (existingLink != null)
        {
            var remainingAfterExisting = outstanding - existingLink.Amount;
            return new PaymentLinkResponseDto
            {
                PaymentLinkId = existingLink.RazorpayPaymentLinkId ?? string.Empty,
                PaymentUrl = existingLink.PaymentLinkUrl ?? string.Empty,
                Reference = existingLink.Reference,
                Amount = existingLink.Amount,
                BookingStatus = booking.Status,
                IsPartialPayment = remainingAfterExisting > 0,
                RemainingAfterThisPayment = Math.Max(0, remainingAfterExisting)
            };
        }

        // Fully covered by wallet/prior chunks — confirm immediately, no further Razorpay link needed.
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
        // Unique Reference Generation Strategy — combines booking ID and ticks so Razorpay's forever-unique constraint never collides on retry.
        string razorpayReference = $"{booking.Id}-{DateTime.UtcNow.Ticks}";

        // Split-Payment Fallback: unactivated/test Razorpay accounts (and possibly live accounts
        // under certain limits) reject a single Payment Link above a maximum amount with a 400
        // "amount exceeds maximum amount allowed" error. Rather than let that call fail, cap what
        // THIS link asks for at the configured limit and hand back however much is left over — the
        // customer pays in successive chunks, each a completely normal Razorpay Payment Link, until
        // the booking's full outstanding balance is collected.
        decimal amountForThisLink = Math.Min(outstanding, _options.MaxPaymentLinkAmount);
        decimal remainingAfterThisLink = outstanding - amountForThisLink;

        long amountPaise = (long)Math.Round(amountForThisLink * 100, MidpointRounding.AwayFromZero);
        var linkResult = await _razorpayClient.CreatePaymentLinkAsync(
            amountPaise, "INR", razorpayReference, booking.User.Phone, $"Payment for booking {booking.Id}");

        // Payment Session Snapshot - records the IsUpiEnabled admin toggle as it stood when THIS link was created, so a later toggle can't retroactively affect an in-flight session.
        var upiSetting = await _context.SystemSettings.FirstOrDefaultAsync(s => s.Key == IsUpiEnabledSettingKey);
        // Fail-Closed Config Default - a missing or corrupt IsUpiEnabled setting must never silently enable a payment method; only an explicit, parseable "true" turns UPI on.
        bool isUpiEnabledAtCreation = upiSetting != null && bool.TryParse(upiSetting.Value, out var upiParsed) && upiParsed;

        var record = new RazorpayPayment
        {
            Reference = razorpayReference,
            BookingId = booking.Id,
            PhoneNumber = booking.User.Phone,
            Amount = amountForThisLink,
            Currency = "INR",
            RazorpayPaymentLinkId = linkResult.PaymentLinkId,
            PaymentLinkUrl = linkResult.ShortUrl,
            PaymentMethod = dto.PaymentMethod,
            WalletAmountApplied = walletToApply,
            Status = "Created",
            IsUpiEnabledSnapshot = isUpiEnabledAtCreation
        };

        _context.RazorpayPayments.Add(record);
        await _context.SaveChangesAsync();

        if (remainingAfterThisLink > 0)
        {
            _logger.LogInformation(
                "Booking {BookingId} outstanding balance {Outstanding} exceeds Razorpay:MaxPaymentLinkAmount {Max} — created a partial link for {ThisAmount}, {Remaining} remaining.",
                booking.Id, outstanding, _options.MaxPaymentLinkAmount, amountForThisLink, remainingAfterThisLink);
        }
        else
        {
            _logger.LogInformation("Created Razorpay payment link for booking {BookingId}, reference {Reference}, amount {Amount}.",
                booking.Id, razorpayReference, amountForThisLink);
        }

        return new PaymentLinkResponseDto
        {
            PaymentLinkId = linkResult.PaymentLinkId,
            PaymentUrl = linkResult.ShortUrl,
            Reference = record.Reference,
            Amount = amountForThisLink,
            BookingStatus = booking.Status,
            IsPartialPayment = remainingAfterThisLink > 0,
            RemainingAfterThisPayment = remainingAfterThisLink
        };
    }

    public async Task<RazorpayPaymentStatusDto?> GetStatusByReferenceAsync(string reference)
    {
        var record = await _context.RazorpayPayments
            .Where(r => r.Reference == reference)
            .OrderByDescending(r => r.CreatedAt)
            .FirstOrDefaultAsync();

        if (record == null) return null;

        var dto = ToStatusDto(record);

        // Split-Payment Fallback: tell the frontend's status poll whether this chunk being Paid also
        // means the booking is fully settled, or whether the customer still needs to pay a further
        // chunk — mirrors the same "how much is still owed" calculation ConfirmLinkedBookingIfAnyAsync
        // uses, so the two never disagree.
        if (record.BookingId.HasValue)
        {
            var booking = await _context.Bookings.FindAsync(record.BookingId.Value);
            if (booking != null)
            {
                dto.BookingStatus = booking.Status;

                if (record.Status == "Paid" && booking.Status != "Confirmed" && booking.Status != "Cancelled")
                {
                    decimal totalRazorpayCollected = await _context.RazorpayPayments
                        .Where(r => r.BookingId == booking.Id && r.Status == "Paid")
                        .SumAsync(r => r.Amount);
                    decimal totalWalletApplied = await _context.RazorpayPayments
                        .Where(r => r.BookingId == booking.Id && r.Status == "Paid")
                        .SumAsync(r => r.WalletAmountApplied);
                    decimal stillOwed = booking.TotalAmount - booking.WalletAmountUsed - totalRazorpayCollected - totalWalletApplied;

                    dto.IsPartialPayment = stillOwed > 0.01m;
                    dto.RemainingAfterThisPayment = Math.Max(0, stillOwed);
                }
            }
        }

        return dto;
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

        // Event-Driven State Machine — switches on Razorpay event type, only applying Paid/Failed transitions when the record isn't already in that state.
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

    // Specification Pattern — builds the transactions query incrementally from optional filters before materializing it.
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

    // Reconciliation Retry Path - re-invokes the existing idempotent ConfirmLinkedBookingIfAnyAsync
    // directly for a RazorpayPayment row that is ALREADY "Paid" (unlike HandleWebhookEventAsync,
    // whose "if (record.Status != "Paid")" guard would just no-op and skip confirmation for a
    // record already in that state). Covers the gap where record.Status was flipped to "Paid" and
    // committed, but the subsequent ConfirmLinkedBookingIfAnyAsync call failed before the booking
    // itself transitioned to Confirmed/Cancelled — safe to call repeatedly since
    // ConfirmLinkedBookingIfAnyAsync has its own idempotency guard (no-ops once the booking is
    // already Confirmed/Cancelled).
    public async Task RetryConfirmationForPaidPaymentAsync(string reference)
    {
        var record = await _context.RazorpayPayments.FirstOrDefaultAsync(r => r.Reference == reference);
        if (record == null || record.Status != "Paid")
            return;

        await ConfirmLinkedBookingIfAnyAsync(record);
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

        // Idempotency Guard — no-ops if the booking is already resolved so repeated webhook delivery can't double-confirm it.
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

        // Split-Payment Fallback: this chunk being Paid doesn't necessarily mean the booking's FULL
        // outstanding balance has been collected — CreatePaymentLinkAsync caps any single link at
        // Razorpay:MaxPaymentLinkAmount, so a large booking may need several Paid chunks before it's
        // actually settled. Sum every Paid chunk (this one included) plus whatever wallet amount was
        // recorded against the sequence's first chunk, and only confirm once that total reaches the
        // booking's TotalAmount.
        decimal totalRazorpayCollected = await _context.RazorpayPayments
            .Where(r => r.BookingId == booking.Id && r.Status == "Paid")
            .SumAsync(r => r.Amount);
        decimal totalWalletApplied = await _context.RazorpayPayments
            .Where(r => r.BookingId == booking.Id && r.Status == "Paid")
            .SumAsync(r => r.WalletAmountApplied);

        decimal totalCollected = totalRazorpayCollected + totalWalletApplied;
        decimal stillOwed = booking.TotalAmount - booking.WalletAmountUsed - totalCollected;

        // Half a paisa of rounding slack — Math.Round on paise conversion can leave a fractional
        // remainder that will never itself become payable.
        if (stillOwed > 0.01m)
        {
            var bookingLabel = string.IsNullOrEmpty(booking.BookingCustomId) ? booking.Id.ToString() : booking.BookingCustomId;

            _logger.LogInformation(
                "Booking {BookingId} received a partial payment (chunk {Amount}); {StillOwed} still owed before it can be confirmed.",
                booking.Id, payment.Amount, stillOwed);

            // Reuses the existing "Pending Additional Payment" status (already used by the
            // modification flow) rather than introducing a new one — the customer's next
            // CreatePaymentLinkAsync call for this booking will recompute `outstanding` as
            // stillOwed and mint the next chunk's link.
            if (booking.Status != "Pending Additional Payment")
                booking.Status = "Pending Additional Payment";
            await _context.SaveChangesAsync();

            await NotifyUserAsync(booking.UserId,
                $"Payment of {payment.Amount:C} received for booking {bookingLabel}. {stillOwed:C} still remains — please complete the remaining payment to confirm your booking.",
                "PartialPaymentReceived");

            await _auditLogService.LogActionAsync(
                "Payment", booking.Id, "PartialPaymentReceived",
                $"Partial payment of {payment.Amount:C} received for booking {bookingLabel} (reference {payment.Reference}); {stillOwed:C} still owed.",
                booking.UserId);

            return;
        }

        await ApplyWalletAndConfirmAsync(booking, totalWalletApplied, payment.PaymentMethod ?? "Razorpay",
            transactionId: payment.RazorpayPaymentId ?? payment.RazorpayPaymentLinkId ?? payment.Reference,
            razorpayAmount: totalRazorpayCollected);
    }

    private async Task ApplyWalletAndConfirmAsync(Booking booking, decimal walletAmount, string paymentMethod, string transactionId, decimal razorpayAmount = 0)
    {
        // DB Transaction + Rollback / Compensation Transaction Pattern - wallet debit, booking confirmation and Payment row are one atomic unit; if SaveChangesAsync throws, the wallet debit (tracked on the same DbContext) is rolled back with everything else instead of leaving the customer short.
        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
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
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

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
