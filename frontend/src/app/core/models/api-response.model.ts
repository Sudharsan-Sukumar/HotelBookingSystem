// Mirrors HotelBooking.API/Common/Models/ApiResponse.cs — every endpoint responds in this envelope.
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: string[];
}
