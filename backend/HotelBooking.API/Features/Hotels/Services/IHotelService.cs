using HotelBooking.API.Features.Hotels.DTOs;

namespace HotelBooking.API.Features.Hotels.Services;

public interface IHotelService
{
    Task<IEnumerable<HotelResponseDto>> GetAllHotelsAsync();
    Task<HotelResponseDto?> GetHotelByIdAsync(int id);
    Task<HotelResponseDto> CreateHotelAsync(HotelRequestDto hotelDto);
    Task<HotelResponseDto?> UpdateHotelAsync(int id, HotelRequestDto hotelDto);
    Task<bool> DeleteHotelAsync(int id);
    Task<IEnumerable<SearchHotelResultDto>> SearchHotelsAsync(SearchRequestDto request);
    Task<bool> AssignManagerAsync(int hotelId, int managerId);
}
