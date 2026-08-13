using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Features.Rooms.DTOs;

namespace HotelBooking.API.Features.Rooms.Services;

public interface IBlockedDateService
{
    Task<BlockedDateResponseDto> AddBlockedDateAsync(BlockedDateRequestDto request);
    Task<IEnumerable<BlockedDateResponseDto>> GetBlockedDatesAsync(int roomTypeId);
    Task DeleteBlockedDateAsync(int id);
}
