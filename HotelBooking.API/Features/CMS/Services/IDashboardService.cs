using System.Threading.Tasks;
using HotelBooking.API.Features.CMS.DTOs;

namespace HotelBooking.API.Features.CMS.Services;

public interface IDashboardService
{
    Task<AdminDashboardDto> GetSummaryAsync();
}
