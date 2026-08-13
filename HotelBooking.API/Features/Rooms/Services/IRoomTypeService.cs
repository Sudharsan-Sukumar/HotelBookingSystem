using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Features.Rooms.DTOs;

namespace HotelBooking.API.Features.Rooms.Services;

public interface IRoomTypeService
{
    Task<RoomTypeResponseDto> CreateRoomTypeAsync(int hotelId, int managerId, RoomTypeRequestDto request);
    Task<IEnumerable<RoomTypeResponseDto>> GetRoomTypesByHotelAsync(int hotelId);
    Task<RoomTypeResponseDto> UpdateRoomTypeAsync(int roomTypeId, int managerId, RoomTypeRequestDto request);
    Task<bool> DeleteRoomTypeAsync(int roomTypeId, int managerId);
    Task<RoomTypeResponseDto> SetMaintenanceModeAsync(int roomTypeId, int managerId, bool isUnderMaintenance);
}
