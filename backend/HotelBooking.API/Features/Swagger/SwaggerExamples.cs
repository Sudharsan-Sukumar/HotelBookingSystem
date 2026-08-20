using Swashbuckle.AspNetCore.Filters;
using HotelBooking.API.Authentication.DTOs;
using HotelBooking.API.Features.Rooms.DTOs;

namespace HotelBooking.API.Features.Swagger;

public class ResendVerificationDtoExample : IExamplesProvider<ResendVerificationDto>
{
    public ResendVerificationDto GetExamples()
    {
        return new ResendVerificationDto
        {
            Email = "john.doe@example.com"
        };
    }
}

public class LoginDtoExample : IExamplesProvider<LoginDto>
{
    public LoginDto GetExamples()
    {
        return new LoginDto
        {
            Email = "xxx@hbs.local",
            Password = "xxx@123"
        };
    }
}

public class RegisterDtoExample : IExamplesProvider<RegisterDto>
{
    public RegisterDto GetExamples()
    {
        return new RegisterDto
        {
            FirstName = "John",
            LastName = "Doe",
            Email = "john.doe@example.com",
            Password = "Password123!",
            ConfirmPassword = "Password123!",
            Phone = "9876543210"
        };
    }
}

public class RoomTypeRequestDtoExample : IExamplesProvider<RoomTypeRequestDto>
{
    public RoomTypeRequestDto GetExamples()
    {
        return new RoomTypeRequestDto
        {
            Name = "Deluxe Ocean View",
            Description = "A beautiful room with a view of the ocean.",
            BasePrice = 250.00m,
            Capacity = 2,
            TotalRooms = 10
        };
    }
}
