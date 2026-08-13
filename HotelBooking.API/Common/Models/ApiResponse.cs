namespace HotelBooking.API.Common.Models;

// Uniform envelope for every controller action's JSON body (success and error alike), so API
// consumers can always branch on `success` instead of guessing the shape from the HTTP status code.
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public T? Data { get; set; }
    public List<string> Errors { get; set; } = new();

    public static ApiResponse<T> SuccessResponse(T? data, string message = "Request successful")
    {
        return new ApiResponse<T> { Success = true, Message = message, Data = data };
    }

    public static ApiResponse<T> ErrorResponse(string message, List<string>? errors = null)
    {
        return new ApiResponse<T> { Success = false, Message = message, Data = default, Errors = errors ?? new() };
    }
}

// Non-generic helper for actions with no payload (e.g. delete, 204-style acknowledgements).
public class ApiResponse : ApiResponse<object?>
{
    public static ApiResponse<object?> SuccessResponse(string message = "Request successful")
    {
        return new ApiResponse<object?> { Success = true, Message = message, Data = null };
    }
}
