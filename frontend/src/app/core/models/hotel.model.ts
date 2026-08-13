// Mirrors HotelBooking.API/Features/Hotels/DTOs

export interface HotelResponseDto {
  id: number;
  hotelCustomId: string;
  name: string;
  description: string;
  location: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  starRating: number;
  thumbnailUrl: string;
  isActive: boolean;
  createdAt: string;
  rowVersion: string;
}

export interface SearchHotelResultDto {
  hotelId: number;
  hotelCustomId: string;
  name: string;
  city: string;
  starRating: number;
  thumbnailUrl: string;
  startingPrice: number;
  isAvailable: boolean;
}

export interface SearchRequestParams {
  destinationCity: string;
  checkInDate: string; // yyyy-MM-dd
  checkOutDate: string; // yyyy-MM-dd
  guests: number;
  pageNumber?: number;
  pageSize?: number;
}
