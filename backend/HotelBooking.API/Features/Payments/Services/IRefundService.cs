using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Features.Payments.DTOs;

namespace HotelBooking.API.Features.Payments.Services;

public interface IRefundService
{
    Task<IEnumerable<RefundResponseDto>> GetRefundsForBookingAsync(int bookingId, int userId, bool isAdmin);
    Task<RefundResponseDto> AdminOverrideRefundAsync(AdminRefundOverrideDto dto, int adminUserId);
}
