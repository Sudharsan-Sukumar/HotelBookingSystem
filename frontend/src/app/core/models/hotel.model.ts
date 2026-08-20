/** Mirrors Features/Hotels/DTOs/*.cs and Features/Rooms/DTOs/RoomTypeResponseDto.cs exactly. */

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

export interface HotelRequestDto {
  name: string;
  description: string;
  location: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  starRating: number;
  isActive: boolean;
  rowVersion?: string | null;
}

export interface SearchRequestDto {
  destinationCity: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  pageNumber?: number;
  pageSize?: number;
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

export interface RoomTypeResponseDto {
  id: number;
  hotelId: number;
  name: string;
  description: string;
  basePrice: number;
  capacity: number;
  totalRooms: number;
  isActive: boolean;
  isUnderMaintenance: boolean;
}

export interface RoomTypeRequestDto {
  name: string;
  description: string;
  basePrice: number;
  capacity: number;
  totalRooms: number;
}

export interface BlockedDateResponseDto {
  id: number;
  roomTypeId: number;
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
}

export interface BlockedDateRequestDto {
  roomTypeId: number;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface PricingOverrideRequestDto {
  roomTypeId: number;
  startDate: string;
  endDate: string;
  price: number;
  isActive?: boolean;
}
