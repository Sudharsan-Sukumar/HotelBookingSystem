using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Features.Bookings.DTOs;

namespace HotelBooking.API.Features.Bookings.Services;

public interface IBookingService
{
    Task<BookingResponseDto> CreateBookingAsync(int userId, BookingRequestDto request);
    Task<BookingResponseDto?> GetBookingByIdAsync(int id, int userId);
    Task<IEnumerable<BookingResponseDto>> GetUserBookingsAsync(int userId);
    Task<BookingResponseDto> ModifyBookingAsync(int id, int userId, ModifyBookingDto request);
    Task<BookingResponseDto> CancelBookingAsync(int id, int userId);
    Task<BookingResponseDto> AdminCancelBookingAsync(int id, string reason, int adminUserId);
    Task<byte[]> GenerateInvoiceCsvAsync(int id, int userId);
    Task<byte[]> GenerateInvoiceCsvForAdminAsync(int id);
    Task<BookingResponseDto> CheckInBookingAsync(int id, int managerId);
    Task<BookingResponseDto> CheckOutBookingAsync(int id, int managerId);
}
