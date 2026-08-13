using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Models;

namespace HotelBooking.API.Features.CMS.Services;

public interface IPromotionService
{
    Task<IEnumerable<Promotion>> GetAllPromotionsAsync(bool isAdmin);
    Task<Promotion?> GetPromotionByIdAsync(int id);
    Task<Promotion> CreatePromotionAsync(PromotionRequestDto dto);
    Task<bool> UpdatePromotionAsync(int id, PromotionRequestDto dto);
    Task<bool> DeletePromotionAsync(int id);
}
