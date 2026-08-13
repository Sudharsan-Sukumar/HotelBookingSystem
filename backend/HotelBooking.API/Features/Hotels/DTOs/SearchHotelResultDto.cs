namespace HotelBooking.API.Features.Hotels.DTOs;

public class SearchHotelResultDto
{
    public int HotelId { get; set; }
    public string HotelCustomId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public int StarRating { get; set; }
    public string ThumbnailUrl { get; set; } = string.Empty;
    public decimal StartingPrice { get; set; }
    public bool IsAvailable { get; set; }
}
