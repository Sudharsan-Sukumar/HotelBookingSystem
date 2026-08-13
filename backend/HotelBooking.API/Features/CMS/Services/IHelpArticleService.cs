using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Features.CMS.DTOs;

namespace HotelBooking.API.Features.CMS.Services;

public interface IHelpArticleService
{
    Task<IEnumerable<HelpArticleResponseDto>> GetAllAsync(bool publishedOnly);
    Task<HelpArticleResponseDto?> GetByIdAsync(int id);
    Task<HelpArticleResponseDto> CreateAsync(HelpArticleRequestDto dto, int adminUserId);
    Task<HelpArticleResponseDto> UpdateAsync(int id, HelpArticleRequestDto dto);
    Task<bool> DeleteAsync(int id);
}
