using System.Threading.Tasks;
using HotelBooking.API.Features.CMS.DTOs;

namespace HotelBooking.API.Features.CMS.Services;

public interface ISiteContentService
{
    Task<HeroContentResponseDto> GetHeroAsync();
    Task<HeroContentResponseDto> UpdateHeroAsync(HeroContentDto dto, int adminUserId);

    Task<AboutContentResponseDto> GetAboutAsync();
    Task<AboutContentResponseDto> UpdateAboutAsync(AboutContentDto dto, int adminUserId);

    Task<ContactContentResponseDto> GetContactAsync();
    Task<ContactContentResponseDto> UpdateContactAsync(ContactContentDto dto, int adminUserId);
}
