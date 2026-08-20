using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using HotelBooking.API.Data;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Models;
using HotelBooking.API.Users.Services;

namespace HotelBooking.API.Features.CMS.Services;

public class GeneralPolicyService : IGeneralPolicyService
{
    private readonly ApplicationDbContext _context;
    private readonly IAuditLogService _auditLogService;

    // Matches the copy that was hardcoded directly into footer.component.html's four policy
    // modals — used as the seed row the first time each policy type is read, so switching the
    // footer over to fetch from the backend causes no visual regression before Admin edits anything.
    private static readonly Dictionary<string, (string Title, string Content)> Defaults = new()
    {
        [GeneralPolicyType.Privacy] = ("Room Booking Policies",
            "<h6 class=\"text-purple fw-bold mb-2\">CHECK-IN / CHECK-OUT</h6>" +
            "<ul class=\"ps-3 mb-3 text-dark d-flex flex-column gap-1\">" +
            "<li>Check-in must be today or a future date</li>" +
            "<li>Check-out must be at least 1 day after check-in</li>" +
            "<li>Maximum stay is 30 consecutive nights</li>" +
            "<li>Bookings can be made up to 365 days in advance</li></ul>" +
            "<h6 class=\"text-purple fw-bold mb-2\">GUESTS &amp; ROOMS</h6>" +
            "<ul class=\"ps-3 mb-0 text-dark d-flex flex-column gap-1\">" +
            "<li>Minimum 1 guest per booking</li>" +
            "<li>Room occupancy is limited by the room type's maximum capacity</li>" +
            "<li>Maximum 5 rooms per single reservation</li></ul>"),

        [GeneralPolicyType.Terms] = ("Payment & Pricing Policies",
            "<h6 class=\"text-purple fw-bold mb-2\">PRICING</h6>" +
            "<ul class=\"ps-3 mb-3 text-dark d-flex flex-column gap-1\">" +
            "<li>An 18% GST is applied on the base subtotal</li>" +
            "<li>Final amount is shown before confirmation</li></ul>" +
            "<h6 class=\"text-purple fw-bold mb-2\">PAYMENT &amp; CONFIRMATION</h6>" +
            "<ul class=\"ps-3 mb-0 text-dark d-flex flex-column gap-1\">" +
            "<li>Booking moves through: Pending &rarr; (payment) &rarr; Confirmed</li>" +
            "<li>Payment via UPI, Credit Card, Debit Card, Net Banking, or Wallet</li>" +
            "<li>Completed bookings are auto-marked after check-out date</li></ul>"),

        [GeneralPolicyType.Modification] = ("Modification Policies",
            "<h6 class=\"text-purple fw-bold mb-2\">ELIGIBILITY</h6>" +
            "<ul class=\"ps-3 mb-3 text-dark d-flex flex-column gap-1\">" +
            "<li>Only Confirmed or Modified bookings can be modified</li>" +
            "<li>Modification is NOT allowed within 24 hours of check-in</li></ul>" +
            "<h6 class=\"text-purple fw-bold mb-2\">DATE CHANGES</h6>" +
            "<ul class=\"ps-3 mb-3 text-dark d-flex flex-column gap-1\">" +
            "<li>New dates cannot be in the past</li>" +
            "<li>Check-out must be at least 1 day after check-in</li>" +
            "<li>Total stay cannot exceed 30 nights</li>" +
            "<li>Room availability for new dates will be verified</li></ul>" +
            "<h6 class=\"text-purple fw-bold mb-2\">PRICING IMPACT</h6>" +
            "<ul class=\"ps-3 mb-0 text-dark d-flex flex-column gap-1\">" +
            "<li>Fare is recalculated based on the new dates</li>" +
            "<li>If new total &gt; current total: additional payment due</li>" +
            "<li>If new total &lt; current total: refund to original payment method</li></ul>"),

        [GeneralPolicyType.CancellationRefund] = ("Cancellation & Refund Policies",
            "<h6 class=\"text-purple fw-bold mb-2\">ELIGIBILITY</h6>" +
            "<ul class=\"ps-3 mb-3 text-dark d-flex flex-column gap-1\">" +
            "<li>Only Confirmed or Modified bookings can be cancelled</li></ul>" +
            "<h6 class=\"text-purple fw-bold mb-2\">REFUND AMOUNT (based on time before check-in)</h6>" +
            "<ul class=\"ps-3 mb-3 text-dark d-flex flex-column gap-1\">" +
            "<li>More than 48 hours before check-in &rarr; full refund per the active cancellation policy</li>" +
            "<li>Between 24 and 48 hours before check-in &rarr; partial refund per the active cancellation policy</li>" +
            "<li>Less than 24 hours before check-in &rarr; no refund</li></ul>" +
            "<h6 class=\"text-purple fw-bold mb-2\">REFUND PROCESS</h6>" +
            "<ul class=\"ps-3 mb-0 text-dark d-flex flex-column gap-1\">" +
            "<li>Refunds are processed to the original payment method</li>" +
            "<li>Refund status: Initiated &rarr; Processing &rarr; Completed</li></ul>")
    };

    public GeneralPolicyService(ApplicationDbContext context, IAuditLogService auditLogService)
    {
        _context = context;
        _auditLogService = auditLogService;
    }

    private static GeneralPolicyResponseDto ToDto(GeneralPolicy p) => new GeneralPolicyResponseDto
    {
        PolicyType = p.PolicyType,
        Title = p.Title,
        Content = p.Content,
        UpdatedAt = p.UpdatedAt
    };

    private async Task<GeneralPolicy> GetOrSeedAsync(string policyType)
    {
        var policy = await _context.GeneralPolicies.FirstOrDefaultAsync(p => p.PolicyType == policyType);
        if (policy != null) return policy;

        var (title, content) = Defaults[policyType];
        policy = new GeneralPolicy { PolicyType = policyType, Title = title, Content = content, UpdatedAt = DateTime.UtcNow };
        _context.GeneralPolicies.Add(policy);
        await _context.SaveChangesAsync();
        return policy;
    }

    public async Task<IEnumerable<GeneralPolicyResponseDto>> GetAllAsync()
    {
        var results = new List<GeneralPolicyResponseDto>();
        foreach (var type in GeneralPolicyType.All)
        {
            results.Add(ToDto(await GetOrSeedAsync(type)));
        }
        return results;
    }

    public async Task<GeneralPolicyResponseDto> GetByTypeAsync(string policyType)
    {
        if (!GeneralPolicyType.IsValid(policyType))
            throw new ArgumentException($"Unknown policy type '{policyType}'.");

        return ToDto(await GetOrSeedAsync(policyType));
    }

    public async Task<GeneralPolicyResponseDto> UpdateAsync(string policyType, GeneralPolicyRequestDto request, int adminUserId)
    {
        if (!GeneralPolicyType.IsValid(policyType))
            throw new ArgumentException($"Unknown policy type '{policyType}'.");

        var policy = await GetOrSeedAsync(policyType);
        policy.Title = request.Title;
        policy.Content = request.Content;
        policy.UpdatedAt = DateTime.UtcNow;
        policy.UpdatedByUserId = adminUserId;

        await _context.SaveChangesAsync();

        await _auditLogService.LogActionAsync(
            "GeneralPolicy", policy.Id, "Update",
            $"Updated general policy '{policyType}'.",
            adminUserId);

        return ToDto(policy);
    }
}
