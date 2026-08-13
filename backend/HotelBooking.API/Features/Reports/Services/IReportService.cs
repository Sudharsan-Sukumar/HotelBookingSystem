using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Features.Reports.DTOs;

namespace HotelBooking.API.Features.Reports.Services;

public interface IReportService
{
    Task<IEnumerable<CustomerBookingSummaryDto>> GetCustomerBookingsSummaryAsync(int userId);
    Task<IEnumerable<CustomerTransactionReportDto>> GetCustomerTransactionsAsync(int userId, DateTime? startDate, DateTime? endDate);
    Task<HotelReservationsReportDto> GetHotelReservationsReportAsync(int hotelId, DateTime? startDate, DateTime? endDate, int? roomTypeId, int page = 1, int pageSize = 100);
    Task<bool> IsManagerOfHotelAsync(int userId, int hotelId);
    Task<SystemWideBookingsReportDto> GetSystemWideBookingsReportAsync(int? hotelId, DateTime? startDate, DateTime? endDate);
    Task<CustomerActivityReportDto> GetCustomerActivityReportAsync(int customerId);
}
