using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Bookings.DTOs;
using HotelBooking.API.Features.Bookings.Models;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Services;
using HotelBooking.API.Features.Bookings.Rules;
using HotelBooking.API.Common.Services;
using HotelBooking.API.Users.Services;
using HotelBooking.API.Users.Models;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.API.Features.Bookings.Services;

public class BookingService : IBookingService
{
    private readonly ApplicationDbContext _context;
    private readonly IPricingRuleService _pricingRuleService;
    private readonly BackgroundEmailQueue _emailQueue;
    private readonly IAuditLogService _auditLogService;
    private readonly INotificationQueue _notificationQueue;
    private readonly ISeasonalPolicyService _seasonalPolicyService;
    private readonly IRoomAllocationService _roomAllocationService;

    private const int PaymentSessionMinutes = 15;
    // Timeout Handling (Grace Tolerance) - small clock-only tolerance for hard-edge UX boundary checks (24h modify cutoff, refund-tier hours), so a request arriving a few minutes late due to normal network latency isn't unfairly rejected; the configured threshold values themselves are unchanged.
    private const int BoundaryGraceMinutes = 3;
    private static readonly string[] PaymentInFlightStatuses = { "Pending Payment", "Pending Additional Payment" };

    // Booking State Machine - single source of truth for which booking status transitions are legal, replacing duplicated ad-hoc status checks across Cancel/CheckIn/CheckOut.
    private static readonly Dictionary<string, string[]> AllowedTransitions = new()
    {
        ["Pending Payment"] = new[] { "Confirmed", "Cancelled" },
        ["Pending Additional Payment"] = new[] { "Confirmed", "Cancelled" },
        ["Confirmed"] = new[] { "CheckedIn", "Cancelled" },
        ["CheckedIn"] = new[] { "CheckedOut" },
        ["CheckedOut"] = new[] { "Completed" },
        ["Cancelled"] = Array.Empty<string>(),
        ["Completed"] = Array.Empty<string>()
    };

    // UI/API Graceful Degradation - surfaces the actual valid next states in the error so the caller (and any UI showing it) knows what to do instead of a bare rejection.
    private static void EnsureValidTransition(string currentStatus, string targetStatus)
    {
        if (!AllowedTransitions.TryGetValue(currentStatus, out var allowed) || !allowed.Contains(targetStatus))
        {
            var validNext = allowed != null && allowed.Length > 0
                ? string.Join(", ", allowed)
                : "none, this is a terminal state";
            throw new InvalidOperationException(
                $"Cannot transition booking from '{currentStatus}' to '{targetStatus}'. Valid transitions from '{currentStatus}': {validNext}.");
        }
    }

    public BookingService(ApplicationDbContext context, IPricingRuleService pricingRuleService, BackgroundEmailQueue emailQueue, IAuditLogService auditLogService, INotificationQueue notificationQueue, ISeasonalPolicyService seasonalPolicyService, IRoomAllocationService roomAllocationService)
    {
        _context = context;
        _pricingRuleService = pricingRuleService;
        _emailQueue = emailQueue;
        _auditLogService = auditLogService;
        _notificationQueue = notificationQueue;
        _seasonalPolicyService = seasonalPolicyService;
        _roomAllocationService = roomAllocationService;
    }

    // QA Defect (Low): BookingCustomId is only generated once a booking is actually paid for
    // (ApplyWalletAndConfirmAsync) — every message built for a still-unpaid booking (creation,
    // or a modify/cancel that happens before payment) used to read "Booking  for..." with an empty
    // gap where the custom ID should be. Falls back to a stable, still-unique "#{Id}" label.
    private static string BookingLabel(Booking booking) =>
        string.IsNullOrEmpty(booking.BookingCustomId) ? $"#{booking.Id}" : booking.BookingCustomId;

    // Queuing is a fast in-memory channel write — it never blocks the booking/payment/refund
    // operation that triggered it. Actual persistence happens later, off-request, in
    // BackgroundNotificationService.
    private async Task NotifyUserAsync(int userId, string message, string type = "Info")
    {
        await _notificationQueue.QueueNotificationAsync(new NotificationRequestDto
        {
            UserId = userId,
            Message = message,
            Type = type
        });
    }

    private async Task NotifyHotelManagersAsync(int hotelId, string message)
    {
        var hotel = await _context.Hotels.FindAsync(hotelId);
        var managerUserIds = hotel?.ManagerIds ?? new List<int>();

        foreach (var managerUserId in managerUserIds)
        {
            await NotifyUserAsync(managerUserId, message, "Alert");
        }
    }

    // Admin Edge Case #15: read the CURRENT cancellation policy — a seasonal override active for
    // the stay's check-in date if the admin has configured one, else the SystemSettings-backed
    // base default (falling back further to the long-standing 48h/100%, 24h/50% defaults if
    // unconfigured) — called only at booking creation time so the result gets snapshotted onto
    // the Booking row itself. Cancellation later always uses that snapshot, never a fresh read of
    // whatever the policy has since become.
    private async Task<(double FullRefundHours, double PartialRefundHours, decimal PartialRefundPercentage)> GetCurrentCancellationPolicyAsync(DateTime checkInDate)
    {
        var effective = await _seasonalPolicyService.GetEffectivePolicyAsync(checkInDate);
        return (effective.FullRefundHours, effective.PartialRefundHours, effective.PartialRefundPercentage);
    }

    // Automatic (non-admin-initiated) refunds are a financial event worth admin oversight — admin
    // overrides are the admin's own action and don't need to notify themselves.
    private async Task NotifyAdminsAsync(string message)
    {
        var adminIds = await _context.Users
            .Include(u => u.Role)
            .Where(u => u.Role.Name == "Admin" && u.Status == "Active")
            .Select(u => u.Id)
            .ToListAsync();

        foreach (var adminId in adminIds)
        {
            await NotifyUserAsync(adminId, message, "Alert");
        }
    }

    public async Task<BookingResponseDto> CreateBookingAsync(int userId, BookingRequestDto request)
    {
        // Guard Clauses — rejects out-of-range room/night counts at the boundary before any DB work begins.
        // Validation (BP-10.3)
        if (request.NumberOfRooms < 1 || request.NumberOfRooms > 5)
            throw new ArgumentException("A single booking allows 1-5 rooms.");
            
        var totalNights = (int)(request.CheckOutDate.Date - request.CheckInDate.Date).TotalDays;
        if (totalNights < 1 || totalNights > 30)
            throw new ArgumentException("Booking must be for 1-30 consecutive nights.");

        var roomType = await _context.RoomTypes
            .Include(rt => rt.Hotel)
            .FirstOrDefaultAsync(rt => rt.Id == request.RoomTypeId && rt.HotelId == request.HotelId);

        if (roomType == null || !roomType.IsActive || !roomType.Hotel.IsActive)
            throw new ArgumentException("Invalid room type or hotel.");

        // Idempotency Check — same pattern as CreatePaymentLinkAsync's "existing Created link" reuse.
        // A page refresh, a double-click on "Proceed to Payment", or the browser Back button
        // re-submitting the same guest-details/invoice-summary flow used to create a brand new
        // "Pending Payment" booking every time, leaving an orphaned duplicate behind once the
        // customer paid for (and thereby only confirmed) one of them. Reuse the still-pending
        // booking for this exact same room/dates/rooms instead of minting another.
        var existingPending = await _context.Bookings
            .Include(b => b.Hotel)
            .Include(b => b.RoomType)
            .Where(b => b.UserId == userId &&
                        b.HotelId == request.HotelId &&
                        b.RoomTypeId == request.RoomTypeId &&
                        b.CheckInDate == request.CheckInDate.Date &&
                        b.CheckOutDate == request.CheckOutDate.Date &&
                        b.NumberOfRooms == request.NumberOfRooms &&
                        b.Status == "Pending Payment" &&
                        (!b.PaymentSessionExpiresAt.HasValue || b.PaymentSessionExpiresAt.Value >= DateTime.UtcNow))
            .OrderByDescending(b => b.CreatedAt)
            .FirstOrDefaultAsync();

        if (existingPending != null)
            return MapToDto(existingPending, existingPending.Hotel.Name, existingPending.RoomType.Name);

        // FR-8.3: reject if any requested date is blocked for this room type
        var isBlocked = await _context.BlockedDates
            .AnyAsync(bd => bd.RoomTypeId == request.RoomTypeId &&
                            bd.StartDate < request.CheckOutDate && bd.EndDate > request.CheckInDate);
        if (isBlocked)
            throw new InvalidOperationException("Rooms of this type are not available for the selected dates.");

        // Re-verify availability (BP-10.2)
        var bookedRoomsCount = await _context.Bookings
            .Where(b => b.HotelId == request.HotelId && 
                        b.RoomTypeId == request.RoomTypeId &&
                        b.Status != "Cancelled" &&
                        b.CheckInDate < request.CheckOutDate && 
                        b.CheckOutDate > request.CheckInDate)
            .SumAsync(b => b.NumberOfRooms);

        if (roomType.TotalRooms - bookedRoomsCount < request.NumberOfRooms)
            throw new InvalidOperationException("Sorry, the selected rooms are no longer available. Please search again.");

        // Calculate Cost with Pricing Overrides
        var pricingOverrides = await _context.PricingOverrides
            .Where(po => po.RoomTypeId == request.RoomTypeId && 
                         po.IsActive && 
                         po.StartDate < request.CheckOutDate && 
                         po.EndDate > request.CheckInDate)
            .ToListAsync();

        decimal baseCost = 0;
        for (int i = 0; i < totalNights; i++)
        {
            var date = request.CheckInDate.AddDays(i);
            var activeOverride = pricingOverrides.FirstOrDefault(po => date >= po.StartDate && date < po.EndDate);
            decimal dailyPrice = activeOverride?.Price ?? roomType.BasePrice;
            
            bool isWeekend = date.DayOfWeek == DayOfWeek.Saturday || date.DayOfWeek == DayOfWeek.Sunday;
            // Assuming no dynamic holidays for now, or fetch from a service
            bool isHoliday = false; 

            dailyPrice = await _pricingRuleService.CalculateDynamicPriceAsync(dailyPrice, isWeekend, isHoliday);
            
            baseCost += dailyPrice * request.NumberOfRooms;
        }

        decimal taxAmount = baseCost * 0.18m; // Assuming 18% tax
        decimal totalAmount = baseCost + taxAmount;

        var (fullRefundHours, partialRefundHours, partialRefundPercentage) = await GetCurrentCancellationPolicyAsync(request.CheckInDate);

        var booking = new Booking
        {
            UserId = userId,
            HotelId = request.HotelId,
            RoomTypeId = request.RoomTypeId,
            CheckInDate = request.CheckInDate.Date,
            CheckOutDate = request.CheckOutDate.Date,
            NumberOfRooms = request.NumberOfRooms,
            SpecialRequests = request.SpecialRequests,
            IDProofType = request.IDProofType,
            IDProofNumber = HashIdProofNumber(request.IDProofNumber),
            BaseCost = baseCost,
            TaxAmount = taxAmount,
            TotalAmount = totalAmount,
            Status = "Pending Payment",
            PaymentSessionExpiresAt = DateTime.UtcNow.AddMinutes(PaymentSessionMinutes),
            FullRefundHoursThreshold = fullRefundHours,
            PartialRefundHoursThreshold = partialRefundHours,
            PartialRefundPercentage = partialRefundPercentage
        };

        // Serializable Transaction Isolation — re-verifies room availability inside a Serializable transaction so two customers can't oversell the last room.
        using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            // Re-check inside transaction (Edge Case 16: Two customers book the last available room simultaneously)
            var finalBookedRoomsCount = await _context.Bookings
                .Where(b => b.HotelId == request.HotelId && 
                            b.RoomTypeId == request.RoomTypeId &&
                            b.Status != "Cancelled" &&
                            b.CheckInDate < request.CheckOutDate && 
                            b.CheckOutDate > request.CheckInDate)
                .SumAsync(b => b.NumberOfRooms);

            if (roomType.TotalRooms - finalBookedRoomsCount < request.NumberOfRooms)
                throw new InvalidOperationException("Sorry, the selected rooms are no longer available. Please search again.");

            _context.Bookings.Add(booking);
            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        // Concurrency Exception Passthrough - rethrows the raw DbUpdateConcurrencyException (instead of wrapping it) so the controller can map it to 409, matching ModifyBookingAsync's existing pattern.
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync();
            throw;
        }
        // Transient-vs-Concurrency Exception Discrimination — separately catches raw transient SqlExceptions from the same isolation conflict that DbUpdateConcurrencyException doesn't reliably cover.
        catch (Exception ex) when (TransientDbFailure.IsTransient(ex))
        {
            // QA Defect (High) — fix, round 2: under real SQL Server Serializable isolation, the
            // loser of a genuine race (two customers booking the last room) doesn't reliably throw
            // DbUpdateConcurrencyException. The FIRST fix only caught DbUpdateException (a
            // SaveChangesAsync-time wrapper), but a serialization/deadlock conflict can just as
            // easily hit the earlier read (the SumAsync availability re-check above, still inside
            // this same Serializable transaction) as a raw, unwrapped SqlException — confirmed live
            // by re-running the exact two-customer race this fix was written for. Either way it's a
            // real, correctly-rejected conflict (the data-integrity outcome was always right — only
            // one booking is ever created); it just needs the same friendly message instead of
            // leaking EF/SqlClient's internal driver text to the client.
            await transaction.RollbackAsync();
            throw new InvalidOperationException("Sorry, the selected rooms are no longer available. Please search again.");
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        // Queue email for background processing instead of blocking
        var user = await _context.Users.FindAsync(userId);
        if (user != null)
        {
            await _emailQueue.QueueEmailAsync(new EmailPayload
            {
                To = user.Email,
                Subject = "Booking Confirmation",
                Body = $"Your booking {BookingLabel(booking)} is confirmed for {roomType.Hotel.Name}."
            });
        }

        // FR-10.9: notify the hotel's managers of the new reservation
        await NotifyHotelManagersAsync(request.HotelId,
            $"New booking {BookingLabel(booking)} for {roomType.Name} ({booking.CheckInDate:yyyy-MM-dd} to {booking.CheckOutDate:yyyy-MM-dd}).");

        await _auditLogService.LogActionAsync(
            "Booking", booking.Id, "Create",
            $"Booking {BookingLabel(booking)} created by customer {userId} for {roomType.Hotel.Name}/{roomType.Name}, {booking.CheckInDate:yyyy-MM-dd} to {booking.CheckOutDate:yyyy-MM-dd}, total {booking.TotalAmount:C}.",
            userId);

        await NotifyUserAsync(userId,
            $"Your booking {BookingLabel(booking)} for {roomType.Hotel.Name} has been created and is awaiting payment.",
            "BookingCreated");

        return MapToDto(booking, roomType.Hotel.Name, roomType.Name);
    }

    public async Task<BookingResponseDto?> GetBookingByIdAsync(int id, int userId)
    {
        var booking = await _context.Bookings
            .Include(b => b.Hotel)
            .Include(b => b.RoomType)
            .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

        if (booking == null) return null;

        return MapToDto(booking, booking.Hotel.Name, booking.RoomType.Name);
    }

    public async Task<IEnumerable<BookingResponseDto>> GetUserBookingsAsync(int userId)
    {
        var bookings = await _context.Bookings
            .Include(b => b.Hotel)
            .Include(b => b.RoomType)
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.CreatedAt)
            .ToListAsync();

        return bookings.Select(b => MapToDto(b, b.Hotel.Name, b.RoomType.Name));
    }

    public async Task<BookingResponseDto> ModifyBookingAsync(int id, int userId, ModifyBookingDto request)
    {
        var booking = await _context.Bookings
            .Include(b => b.RoomType)
            .Include(b => b.Hotel)
            .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

        if (booking == null)
            throw new ArgumentException("Booking not found.");

        if (booking.Status == "Cancelled" || booking.Status == "Completed")
            throw new InvalidOperationException($"This booking has been {booking.Status.ToLower()} and cannot be modified.");

        // Edge Case: a booking with a payment in flight is locked against modification until that payment resolves.
        if (PaymentInFlightStatuses.Contains(booking.Status))
            throw new InvalidOperationException("This booking cannot be modified while a payment is in progress. Please complete or cancel the current payment first.");

        // BP-11.1
        var hoursUntilCheckIn = (booking.CheckInDate - DateTime.UtcNow.AddMinutes(-BoundaryGraceMinutes)).TotalHours;
        if (hoursUntilCheckIn < 24)
            throw new InvalidOperationException("Modifications are not allowed within 24 hours of check-in.");

        // TC001 fix: guest count is not a stored/modifiable property of a Booking (see
        // ModifyBookingDto.GuestCount's own comment), but if a caller sends one anyway it must be
        // rejected outright rather than silently ignored — this is the server-side boundary the
        // Angular UI's own (now-disabled) guest display cannot be trusted to enforce alone.
        if (request.GuestCount.HasValue && (request.GuestCount.Value < 1 || request.GuestCount.Value > booking.RoomType.Capacity))
        {
            throw new InvalidOperationException(
                $"Guest count exceeds the maximum occupancy of {booking.RoomType.Capacity} for {booking.RoomType.Name}.");
        }

        var totalNights = (int)(request.CheckOutDate.Date - request.CheckInDate.Date).TotalDays;

        // Optimistic Concurrency (RowVersion) — applies the client's last-seen RowVersion as EF's original value to catch stale multi-tab edits.
        // Customer Edge Case #21: multi-tab edits. If the client submitted the RowVersion it last
        // saw, use it as the concurrency token's original value — a stale submission (this booking
        // changed since that tab loaded it) is then rejected at SaveChangesAsync below instead of
        // silently overwriting whatever the newer state was.
        if (!string.IsNullOrEmpty(request.RowVersion))
        {
            _context.Entry(booking).Property(b => b.RowVersion).OriginalValue = Convert.FromBase64String(request.RowVersion);
        }

        // FR-8.3: reject if any newly-requested date is blocked for this room type
        var isBlocked = await _context.BlockedDates
            .AnyAsync(bd => bd.RoomTypeId == booking.RoomTypeId &&
                            bd.StartDate < request.CheckOutDate && bd.EndDate > request.CheckInDate);
        if (isBlocked)
            throw new InvalidOperationException("Rooms of this type are not available for the selected dates.");

        // Calculate new cost
        decimal newBaseCost = booking.RoomType.BasePrice * totalNights * booking.NumberOfRooms;
        decimal newTaxAmount = newBaseCost * 0.18m;
        decimal newTotalAmount = newBaseCost + newTaxAmount;

        decimal difference = newTotalAmount - booking.TotalAmount;

        booking.CheckInDate = request.CheckInDate.Date;
        booking.CheckOutDate = request.CheckOutDate.Date;
        booking.BaseCost = newBaseCost;
        booking.TaxAmount = newTaxAmount;

        if (difference > 0)
        {
            // BP-11.2 Higher cost requires upfront payment
            booking.TotalAmount = newTotalAmount;
            booking.Status = "Pending Additional Payment";
            booking.PaymentSessionExpiresAt = DateTime.UtcNow.AddMinutes(PaymentSessionMinutes);
        }
        else if (difference < 0)
        {
            // BP-11.3 Lower cost results in wallet credit
            booking.TotalAmount = newTotalAmount;
            var user = await _context.Users.FindAsync(userId);
            if (user != null)
            {
                user.WalletBalance += Math.Abs(difference);
            }
        }

        // Serializable Transaction Isolation — re-verifies room inventory for the new dates before committing a modified date range.
        // Customer Edge Case #14: re-verify room-inventory availability for the new dates inside a
        // Serializable transaction — mirrors CreateBookingAsync's protection against two concurrent
        // requests (e.g. this modify racing another booking/modify for the same room type) both
        // reading "room available" before either commits and overselling the room type.
        using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            var bookedRoomsCount = await _context.Bookings
                .Where(b => b.Id != id &&
                            b.HotelId == booking.HotelId &&
                            b.RoomTypeId == booking.RoomTypeId &&
                            b.Status != "Cancelled" &&
                            b.CheckInDate < request.CheckOutDate &&
                            b.CheckOutDate > request.CheckInDate)
                .SumAsync(b => b.NumberOfRooms);

            if (booking.RoomType.TotalRooms - bookedRoomsCount < booking.NumberOfRooms)
                throw new InvalidOperationException("Rooms are not available for the new dates.");

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            // QA Defect (B3 live re-verification): this used to be re-thrown as InvalidOperationException,
            // which BookingsController.ModifyBooking maps to 400. The Angular modify-step3 component's
            // reload-prompt UX only triggers on err.status === 409, so a genuine multi-tab conflict was
            // silently falling back to the generic "please try again" message with no reload button.
            // Rethrowing the concurrency exception itself lets the controller map it to 409 distinctly.
            await transaction.RollbackAsync();
            throw;
        }
        catch (Exception ex) when (TransientDbFailure.IsTransient(ex))
        {
            // Same class of defect as CreateBookingAsync (see its comment for the full story) — a
            // Serializable-isolation conflict on modify can surface as either DbUpdateException or a
            // raw SqlException depending on whether the conflict hits the write or an earlier read.
            await transaction.RollbackAsync();
            throw new InvalidOperationException("Rooms are not available for the new dates. Please try again.");
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        await _auditLogService.LogActionAsync(
            "Booking", booking.Id, "Modify",
            $"Booking {BookingLabel(booking)} modified by customer {userId}. New dates: {booking.CheckInDate:yyyy-MM-dd} to {booking.CheckOutDate:yyyy-MM-dd}. New total: {booking.TotalAmount:C}.",
            userId);

        await NotifyUserAsync(userId,
            $"Your booking {BookingLabel(booking)} has been modified. New dates: {booking.CheckInDate:yyyy-MM-dd} to {booking.CheckOutDate:yyyy-MM-dd}.",
            "BookingModified");

        await NotifyHotelManagersAsync(booking.HotelId,
            $"Booking {BookingLabel(booking)} for {booking.RoomType.Name} was modified by the customer. New dates: {booking.CheckInDate:yyyy-MM-dd} to {booking.CheckOutDate:yyyy-MM-dd}.");

        return MapToDto(booking, booking.Hotel.Name, booking.RoomType.Name);
    }

    public async Task<BookingResponseDto> CancelBookingAsync(int id, int userId)
    {
        var booking = await _context.Bookings
            .Include(b => b.Hotel)
            .Include(b => b.RoomType)
            .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

        if (booking == null)
            throw new ArgumentException("Booking not found.");

        EnsureValidTransition(booking.Status, "Cancelled");

        // Edge Case: a booking mid-modification (awaiting the additional payment) is locked against cancellation
        // until that payment resolves, so only one of Cancel/Modify can win a race.
        if (booking.Status == "Pending Additional Payment")
            throw new InvalidOperationException("This booking cannot be cancelled while a modification payment is in progress. Please complete or wait for that payment to resolve first.");

        var hoursUntilCheckIn = (booking.CheckInDate - DateTime.UtcNow.AddMinutes(-BoundaryGraceMinutes)).TotalHours;

        // QA Defect (Critical): refund tiers below only apply to money that was ACTUALLY collected.
        // A booking still "Pending Payment" was never paid for — cancelling it must never create a
        // Refund row or credit the wallet, regardless of how far out check-in is. Previously the
        // tiered refund was computed purely from hoursUntilCheckIn/TotalAmount with no check on
        // whether the booking had actually been paid, letting a customer create-then-cancel an
        // unpaid booking to mint free wallet balance, repeatably.
        bool wasPaid = booking.Status == "Confirmed";

        if (hoursUntilCheckIn < booking.PartialRefundHoursThreshold)
        {
            // BP-12.3: No Refund
            booking.Status = "Cancelled";
            booking.CancelledAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            await _auditLogService.LogActionAsync(
                "Booking", booking.Id, "Cancel",
                $"Booking {BookingLabel(booking)} cancelled by customer {userId}" +
                (wasPaid ? " (non-refundable — within 24 hours of check-in)." : " (booking was never paid; nothing to refund)."),
                userId);

            throw new InvalidOperationException(wasPaid
                ? "This cancellation is non-refundable as it is within 24 hours of check-in."
                : "Booking cancelled. No refund is due since it was never paid for.");
        }

        // Tiered State Machine — refund tier (full/partial/none) is chosen from hours-until-check-in against this booking's own policy snapshot.
        decimal refundAmount = 0;
        if (wasPaid)
        {
            if (hoursUntilCheckIn > booking.FullRefundHoursThreshold)
            {
                // BP-12.1: 100% Refund
                refundAmount = booking.TotalAmount;
            }
            else if (hoursUntilCheckIn >= booking.PartialRefundHoursThreshold && hoursUntilCheckIn <= booking.FullRefundHoursThreshold)
            {
                // BP-12.2: partial refund, per this booking's own policy snapshot
                refundAmount = booking.TotalAmount * booking.PartialRefundPercentage;
            }
        }

        booking.Status = "Cancelled";
        booking.CancelledAt = DateTime.UtcNow;

        // Compensating Transaction — credits the customer's wallet and records a Refund row as the compensating action for the now-cancelled booking.
        var cancellingUser = await _context.Users.FindAsync(userId);

        // Transaction Lock (Serializable) - the refund-guard check and refund creation now share one scope with AdminCancelBookingAsync's equivalent block, so a transient DB blip on the check itself rolls back and fails closed instead of propagating inconsistently between the two methods.
        using var refundTransaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
        try
        {
            // Refund Status Guard - defense-in-depth backstop against a double refund on top of the Booking.Status check, in case this ever runs on a booking whose status wasn't yet flipped.
            bool refundAlreadyExists = await _context.Refunds.AnyAsync(r => r.BookingId == booking.Id);
            if (refundAmount > 0 && !refundAlreadyExists)
            {
                if (cancellingUser != null)
                {
                    cancellingUser.WalletBalance += refundAmount;
                }

                _context.Refunds.Add(new Features.Payments.Models.Refund
                {
                    BookingId = booking.Id,
                    Amount = refundAmount,
                    Status = "Completed",
                    Destination = "Wallet",
                    InitiatedByUserId = userId,
                    IsAdminOverride = false,
                    CompletedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
            await refundTransaction.CommitAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            await refundTransaction.RollbackAsync();
            throw;
        }
        catch (Exception ex) when (TransientDbFailure.IsTransient(ex))
        {
            await refundTransaction.RollbackAsync();
            throw new InvalidOperationException("The booking state was modified by another transaction. Please try again.");
        }
        catch
        {
            await refundTransaction.RollbackAsync();
            throw;
        }

        if (cancellingUser != null)
        {
            await _emailQueue.QueueEmailAsync(new EmailPayload
            {
                To = cancellingUser.Email,
                Subject = "Booking Cancelled",
                Body = $"Your booking {BookingLabel(booking)} has been cancelled. Refund amount: {refundAmount:C}."
            });
        }

        await _auditLogService.LogActionAsync(
            "Booking", booking.Id, "Cancel",
            $"Booking {BookingLabel(booking)} cancelled by customer {userId}. Refund: {refundAmount:C}.",
            userId);

        // FR-12.7: notify the hotel's managers of the cancellation
        await NotifyHotelManagersAsync(booking.HotelId,
            $"Booking {BookingLabel(booking)} for {booking.RoomType.Name} was cancelled by the customer.");

        await NotifyUserAsync(userId,
            $"Your booking {BookingLabel(booking)} has been cancelled. Refund amount: {refundAmount:C}.",
            "BookingCancelled");

        if (refundAmount > 0)
        {
            await NotifyAdminsAsync(
                $"Refund of {refundAmount:C} was automatically processed to the customer's wallet for booking {BookingLabel(booking)} (customer cancellation).");
        }

        return MapToDto(booking, booking.Hotel.Name, booking.RoomType.Name);
    }

    // State Machine Transition Guard — rejects cancelling a booking already Cancelled or Completed before mutating status.
    public async Task<BookingResponseDto> AdminCancelBookingAsync(int id, string reason, int adminUserId)
    {
        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length < 10)
            throw new ArgumentException("Cancellation reason must be at least 10 characters.");

        var booking = await _context.Bookings
            .Include(b => b.Hotel)
            .Include(b => b.RoomType)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null)
            throw new ArgumentException("Booking not found.");

        EnsureValidTransition(booking.Status, "Cancelled");

        var hoursUntilCheckIn = (booking.CheckInDate - DateTime.UtcNow).TotalHours;

        // QA Defect (Critical) — same fix as CancelBookingAsync: never refund a booking that was
        // never actually paid for.
        bool wasPaid = booking.Status == "Confirmed";
        decimal refundAmount = !wasPaid ? 0
            : hoursUntilCheckIn > booking.FullRefundHoursThreshold ? booking.TotalAmount
            : hoursUntilCheckIn >= booking.PartialRefundHoursThreshold ? booking.TotalAmount * booking.PartialRefundPercentage
            : 0;

        User? affectedUser = null;

        // Bounded Retry - a transient DB conflict on this Serializable transaction gets exactly one retry (2 attempts total) before surfacing the friendly error, so the client isn't forced to manually resubmit for a self-correcting blip; business-rule conflicts (stale status, already-processed) are never retried.
        const int maxAttempts = 2;
        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            using var transaction = await _context.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable);
            try
            {
                var freshStatus = await _context.Bookings.Where(b => b.Id == booking.Id).Select(b => b.Status).FirstOrDefaultAsync();
                if (freshStatus != booking.Status)
                    throw new InvalidOperationException("This booking was already processed by another admin action. Please refresh.");

                booking.Status = "Cancelled";
                booking.CancelledAt = DateTime.UtcNow;

                affectedUser = await _context.Users.FindAsync(booking.UserId);

                // Refund Status Guard - defense-in-depth backstop so two concurrent admin cancellations can't both create a Refund row for the same booking.
                bool refundAlreadyExists = await _context.Refunds.AnyAsync(r => r.BookingId == booking.Id);
                if (refundAmount > 0 && affectedUser != null && !refundAlreadyExists)
                {
                    affectedUser.WalletBalance += refundAmount;

                    _context.Refunds.Add(new Features.Payments.Models.Refund
                    {
                        BookingId = booking.Id,
                        Amount = refundAmount,
                        Status = "Completed",
                        Destination = "Wallet",
                        InitiatedByUserId = adminUserId,
                        IsAdminOverride = true,
                        Reason = reason,
                        CompletedAt = DateTime.UtcNow
                    });
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                break;
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                throw new InvalidOperationException("This booking was already processed by another admin action. Please refresh.");
            }
            catch (Exception ex) when (TransientDbFailure.IsTransient(ex) && attempt < maxAttempts)
            {
                await transaction.RollbackAsync();
                // Retry once on the next loop iteration.
            }
            catch (Exception ex) when (TransientDbFailure.IsTransient(ex))
            {
                await transaction.RollbackAsync();
                throw new InvalidOperationException("This booking was already processed by another admin action. Please refresh.");
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        // Audit Trail — persists actor, reason, and refund amount for this admin override so the action is traceable after the fact.
        await _auditLogService.LogActionAsync(
            "Booking", booking.Id, "AdminCancel",
            $"Admin {adminUserId} cancelled booking {BookingLabel(booking)}. Reason: {reason}. Refund: {refundAmount:C}.",
            adminUserId);

        if (affectedUser != null)
        {
            await _emailQueue.QueueEmailAsync(new EmailPayload
            {
                To = affectedUser.Email,
                Subject = "Your booking was cancelled by an administrator",
                Body = $"Your booking {BookingLabel(booking)} was cancelled by an administrator. Reason: {reason}. Refund amount: {refundAmount:C}."
            });
        }

        await NotifyHotelManagersAsync(booking.HotelId,
            $"Booking {BookingLabel(booking)} for {booking.RoomType.Name} was cancelled by an administrator. Reason: {reason}");

        if (affectedUser != null)
        {
            await NotifyUserAsync(affectedUser.Id,
                $"Your booking {BookingLabel(booking)} was cancelled by an administrator. Reason: {reason}. Refund amount: {refundAmount:C}.",
                "BookingCancelled");
        }

        return MapToDto(booking, booking.Hotel.Name, booking.RoomType.Name);
    }

    public async Task<BookingResponseDto> CheckInBookingAsync(int id, int managerId)
    {
        var booking = await _context.Bookings
            .Include(b => b.Hotel)
            .Include(b => b.RoomType)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null)
            throw new ArgumentException("Booking not found.");

        if (!booking.Hotel.ManagerIds.Contains(managerId))
            throw new UnauthorizedAccessException("You can only check in bookings for your own hotels.");

        EnsureValidTransition(booking.Status, "CheckedIn");

        // Operational Fallback - a no-physical-rooms failure must still fail the check-in (never silently assign nothing), but managers are proactively alerted so they can resolve the shortage manually.
        try
        {
            // Room Allocation Service - Assigns physical rooms at check-in, excluding maintenance/occupied rooms
            await _roomAllocationService.AllocateRoomsAsync(booking.Id, managerId);
        }
        catch (InvalidOperationException ex) when (ex.Message == "Not enough physical rooms available for allocation.")
        {
            await _auditLogService.LogActionAsync(
                "Booking", booking.Id, "CheckInFailed",
                $"Check-in failed for booking {BookingLabel(booking)}: no physical rooms available for allocation ({booking.RoomType.Name}).",
                managerId);

            await NotifyHotelManagersAsync(booking.HotelId,
                $"Check-in failed for booking {BookingLabel(booking)}: no physical rooms available for {booking.RoomType.Name}. Manual room assignment may be required.");

            throw;
        }

        booking.Status = "CheckedIn";
        await _context.SaveChangesAsync();

        await _auditLogService.LogActionAsync(
            "Booking", booking.Id, "CheckIn",
            $"Booking {BookingLabel(booking)} checked in by manager {managerId}.",
            managerId);

        await NotifyUserAsync(booking.UserId,
            $"You have been checked in for booking {BookingLabel(booking)}.",
            "BookingCheckedIn");

        return MapToDto(booking, booking.Hotel.Name, booking.RoomType.Name);
    }

    public async Task<BookingResponseDto> CheckOutBookingAsync(int id, int managerId)
    {
        var booking = await _context.Bookings
            .Include(b => b.Hotel)
            .Include(b => b.RoomType)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null)
            throw new ArgumentException("Booking not found.");

        if (!booking.Hotel.ManagerIds.Contains(managerId))
            throw new UnauthorizedAccessException("You can only check out bookings for your own hotels.");

        EnsureValidTransition(booking.Status, "CheckedOut");

        booking.Status = "CheckedOut";
        await _context.SaveChangesAsync();

        await _auditLogService.LogActionAsync(
            "Booking", booking.Id, "CheckOut",
            $"Booking {BookingLabel(booking)} checked out by manager {managerId}.",
            managerId);

        await NotifyUserAsync(booking.UserId,
            $"You have been checked out for booking {BookingLabel(booking)}. Thank you for staying with us!",
            "BookingCheckedOut");

        return MapToDto(booking, booking.Hotel.Name, booking.RoomType.Name);
    }

    public async Task<byte[]> GenerateInvoiceCsvAsync(int id, int userId)
    {
        var booking = await _context.Bookings
            .Include(b => b.Hotel)
            .Include(b => b.RoomType)
            .Include(b => b.User)
            .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

        if (booking == null)
            throw new ArgumentException("Booking not found.");

        return await BuildInvoiceCsvAsync(booking);
    }

    // Admin invoice download (Booking History) — same invoice content the customer already gets
    // from GenerateInvoiceCsvAsync, just resolved by booking id alone (no owner check) since an
    // admin is entitled to view any booking's invoice. Reuses BuildInvoiceCsvAsync so the CSV
    // format/columns can never drift between the two entry points.
    // Facade — exposes an admin-scoped (no owner-check) entry point that delegates to the same shared CSV assembly logic.
    public async Task<byte[]> GenerateInvoiceCsvForAdminAsync(int id)
    {
        var booking = await _context.Bookings
            .Include(b => b.Hotel)
            .Include(b => b.RoomType)
            .Include(b => b.User)
            .FirstOrDefaultAsync(b => b.Id == id);

        if (booking == null)
            throw new ArgumentException("Booking not found.");

        return await BuildInvoiceCsvAsync(booking);
    }

    private async Task<byte[]> BuildInvoiceCsvAsync(Booking booking)
    {
        if (booking.Status != "Confirmed" && booking.Status != "Completed")
            throw new InvalidOperationException("Invoice is only available for confirmed and completed bookings.");

        var payment = await _context.Payments
            .Where(p => p.BookingId == booking.Id && p.Status == "Completed")
            .OrderByDescending(p => p.PaymentDate)
            .FirstOrDefaultAsync();

        var sb = new System.Text.StringBuilder();
        sb.AppendLine("Field,Value");
        sb.AppendLine($"Booking ID,{booking.BookingCustomId}");
        sb.AppendLine($"Customer,{booking.User.FirstName} {booking.User.LastName}");
        sb.AppendLine($"Hotel,{booking.Hotel.Name}");
        sb.AppendLine($"Room Type,{booking.RoomType.Name}");
        sb.AppendLine($"Check-In,{booking.CheckInDate:yyyy-MM-dd}");
        sb.AppendLine($"Check-Out,{booking.CheckOutDate:yyyy-MM-dd}");
        sb.AppendLine($"Number of Rooms,{booking.NumberOfRooms}");
        sb.AppendLine($"Base Cost,{booking.BaseCost}");
        sb.AppendLine($"Tax,{booking.TaxAmount}");
        sb.AppendLine($"Wallet Amount Used,{booking.WalletAmountUsed}");
        sb.AppendLine($"Total Amount,{booking.TotalAmount}");
        sb.AppendLine($"Status,{booking.Status}");
        sb.AppendLine($"Transaction ID,{payment?.TransactionId}");
        sb.AppendLine($"Payment Method,{payment?.PaymentMethod}");
        sb.AppendLine($"Payment Date,{payment?.PaymentDate:yyyy-MM-dd HH:mm}");

        return System.Text.Encoding.UTF8.GetBytes(sb.ToString());
    }

    // Guest ID proof TYPE is only shown once the booking is an actual confirmed stay — not while
    // still "Pending Payment"/"Pending Additional Payment" (never happened yet) or "Cancelled"
    // (won't). The ID proof NUMBER is never returned by the API at all: it's stored as a one-way
    // BCrypt hash (see HashIdProofNumber/VerifyIdProofNumber below), so there is no plain value to
    // send back — only the original submitter ever saw the real number, at entry time.
    // Specification Pattern — centralizes which booking statuses may expose ID proof type in the response DTO.
    private static readonly string[] IDProofVisibleStatuses = { "Confirmed", "CheckedIn", "CheckedOut", "Completed" };

    /// <summary>
    /// Hashes a guest ID proof number (Aadhaar/PAN/Passport/etc.) with BCrypt before persistence.
    /// One-way — the original value cannot be recovered from the returned hash.
    /// </summary>
    // One-Way Hash Encapsulation — guest ID proof number is BCrypt-hashed at write time so no code path can ever return the plaintext.
    private static string HashIdProofNumber(string idProofNumber) =>
        BCrypt.Net.BCrypt.HashPassword(idProofNumber, workFactor: 12);

    /// <summary>
    /// Verifies a freshly-provided ID proof number against a previously stored BCrypt hash.
    /// Not called anywhere yet (no feature currently re-verifies a guest's ID against the stored
    /// value), but kept available for that flow per the one-way hash+verify design.
    /// </summary>
    public static bool VerifyIdProofNumber(string providedIdProofNumber, string storedHash) =>
        BCrypt.Net.BCrypt.Verify(providedIdProofNumber, storedHash);

    private static BookingResponseDto MapToDto(Booking booking, string hotelName, string roomTypeName)
    {
        bool showIDProof = Array.IndexOf(IDProofVisibleStatuses, booking.Status) >= 0;

        return new BookingResponseDto
        {
            Id = booking.Id,
            BookingCustomId = booking.BookingCustomId,
            HotelName = hotelName,
            RoomTypeName = roomTypeName,
            CheckInDate = booking.CheckInDate,
            CheckOutDate = booking.CheckOutDate,
            NumberOfRooms = booking.NumberOfRooms,
            SpecialRequests = booking.SpecialRequests,
            IDProofType = showIDProof ? booking.IDProofType : null,
            // Never the stored hash — a BCrypt hash is useless to display and must not be exposed
            // unnecessarily. The field stays in the contract (still nullable, same type) for
            // backward compatibility; it now simply always resolves to null.
            IDProofNumber = null,
            BaseCost = booking.BaseCost,
            TaxAmount = booking.TaxAmount,
            WalletAmountUsed = booking.WalletAmountUsed,
            TotalAmount = booking.TotalAmount,
            Status = booking.Status,
            CreatedAt = booking.CreatedAt,
            RowVersion = Convert.ToBase64String(booking.RowVersion)
        };
    }
}
