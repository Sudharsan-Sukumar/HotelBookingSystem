using System.Threading.Tasks;
using HotelBooking.API.Features.AI.DTOs;

namespace HotelBooking.API.Features.AI.Services;

public interface IAiChatService
{
    // userId is null for an unauthenticated visitor — booking/payment tools then refuse to look up
    // any customer-specific data rather than guessing or exposing anything.
    Task<ChatResponseDto> GetReplyAsync(ChatRequestDto request, int? userId);
}
