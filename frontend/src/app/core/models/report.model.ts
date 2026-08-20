/** Mirrors Features/Reports/DTOs/*.cs exactly (Admin reports endpoints, api/reports/admin/*). */

export interface HotelPerformanceDto {
  hotelCustomId: string;
  hotelName: string;
  bookingsCount: number;
  revenue: number;
  cancellationRate: number;
  occupancyRate: number;
}

/** GET api/reports/admin/system-bookings?hotelId=&startDate=&endDate= */
export interface SystemWideBookingsReportDto {
  totalBookings: number;
  totalRevenue: number;
  systemCancellationRate: number;
  averageOccupancyRate: number;
  hotelPerformances: HotelPerformanceDto[];
}

/** GET api/reports/admin/customer-activity/{customerId} */
export interface CustomerActivityReportDto {
  customerCustomId: string;
  fullName: string;
  email: string;
  registrationDate: string;
  totalBookings: number;
  totalSpend: number;
  cancellations: number;
  reviewsSubmitted: number; // backend note: mocked as 0 for now
}

export interface ReservationDetailDto {
  bookingCustomId: string;
  customerName: string;
  roomTypeName: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  amount: number;
}

/** GET api/reports/admin/hotel-reservations/{hotelId}?startDate=&endDate=&roomTypeId=&page=&pageSize= (pageSize capped at 500) */
export interface HotelReservationsReportDto {
  hotelName: string;
  totalBookings: number;
  totalRevenue: number;
  occupancyRatePercentage: number;
  page: number;
  pageSize: number;
  reservations: ReservationDetailDto[];
}
