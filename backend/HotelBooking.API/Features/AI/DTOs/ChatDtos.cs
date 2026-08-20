using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace HotelBooking.API.Features.AI.DTOs;

public class ChatTurnDto
{
    [Required]
    public string Role { get; set; } = string.Empty; // "user" | "assistant"

    [Required]
    public string Content { get; set; } = string.Empty;
}

public class ChatRequestDto
{
    [Required]
    [MaxLength(2000, ErrorMessage = "Message must not exceed 2000 characters.")]
    public string Message { get; set; } = string.Empty;

    // Prior turns from this browser session, for conversational context. Kept client-side only —
    // nothing is persisted server-side, matching "conversation history during the current session".
    public List<ChatTurnDto> History { get; set; } = new();
}

public class ChatResponseDto
{
    public string Reply { get; set; } = string.Empty;
}
