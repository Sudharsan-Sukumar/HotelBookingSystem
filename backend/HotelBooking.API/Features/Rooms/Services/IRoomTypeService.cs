using System;
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

    // Real, live availability count for a date range — the same overlap-count-against-TotalRooms
    // query BookingService.CreateBookingAsync/ModifyBookingAsync already run inline, extracted here
    // as a reusable read so callers (e.g. the AI assistant) can check availability without
    // duplicating booking-creation business logic. Returns 0 if the room type is inactive, under
    // maintenance, or has an admin-blocked date overlapping the range.
    Task<int> GetAvailableRoomCountAsync(int hotelId, int roomTypeId, DateTime checkIn, DateTime checkOut);
}
