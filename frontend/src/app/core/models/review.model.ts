// Mirrors HotelBooking.API/Features/Reviews

export interface Review {
  id: number;
  bookingId: number;
  customerId: number;
  hotelId: number;
  rating: number;
  comment: string | null;
  managerResponse: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface ReviewCreateDto {
  bookingId: number;
  rating: number;
  comment?: string;
}

export interface ManagerResponseDto {
  response: string;
}
