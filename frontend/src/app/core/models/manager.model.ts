/** Models for manager-scoped features not already covered by hotel.model.ts / booking.model.ts.
 *  Mirrors the corresponding backend DTOs/entities exactly (see file comments below). */

// Mirrors Features/Reports/DTOs/HotelReservationsReportDto.cs. ReservationDetailDto includes the
// numeric booking `id` alongside `bookingCustomId`, which manager check-in/check-out mutations
// (PUT /api/bookings/{id}/check-in|check-out) are driven from.
export interface ReservationDetailDto {
  id: number;
  bookingCustomId: string;
  customerName: string;
  roomTypeName: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  amount: number;
}

export interface HotelReservationsReportDto {
  hotelName: string;
  totalBookings: number;
  totalRevenue: number;
  occupancyRatePercentage: number;
  page: number;
  pageSize: number;
  reservations: ReservationDetailDto[];
}

// Mirrors Users/DTOs/UserDto.cs
export interface UserDto {
  id: number;
  userCustomId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleName: string;
  status: string;
  createdAt: string;
  profilePhotoUrl?: string | null;
}

// Mirrors Users/DTOs/ProfileUpdateDto.cs
export interface ProfileUpdateDto {
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
}

// Mirrors Users/DTOs/ChangePasswordDto.cs
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

// Mirrors Features/CMS/Models/Notification.cs (no "title" field on the real entity)
export interface NotificationDto {
  id: number;
  userId: number;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

// Mirrors Features/Reviews/Models/Review.cs
export interface ReviewDto {
  id: number;
  bookingId: number;
  customerId: number;
  hotelId: number;
  rating: number;
  comment?: string | null;
  managerResponse?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  isDeleted: boolean;
}

// Mirrors Features/Reviews/DTOs/ManagerResponseDto.cs
export interface ManagerResponseDto {
  response: string;
}

// Mirrors Features/Hotels/DTOs/HotelImageResponseDto.cs
export interface HotelImageResponseDto {
  id: number;
  url: string;
  caption: string;
  isPrimary: boolean;
  uploadedAt: string;
}

// Mirrors Features/Hotels/Models/RoomTypeImage.cs (raw entity is returned as-is by GalleriesController)
export interface RoomTypeImageDto {
  id: number;
  roomTypeId: number;
  url: string;
  fileHash: string;
  uploadedAt: string;
}

// Mirrors Features/Rooms/Models/PricingOverride.cs (raw entity is returned as-is by PricingOverridesController)
export interface PricingOverrideDto {
  id: number;
  roomTypeId: number;
  startDate: string;
  endDate: string;
  price: number;
  isActive: boolean;
}
