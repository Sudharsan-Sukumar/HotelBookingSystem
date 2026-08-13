using HotelBooking.API.Features.Hotels.Services;
using Microsoft.Extensions.DependencyInjection;

namespace HotelBooking.API.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IHotelService, HotelService>();
        
        return services;
    }
}
