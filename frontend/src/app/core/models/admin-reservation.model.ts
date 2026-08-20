/** Mirrors Features/Reports/DTOs/HotelReservationsReportDto.cs exactly. ReservationDetailDto now
 * includes the numeric booking `id` alongside `bookingCustomId`, which admin per-booking mutations
 * (cancel, direct-URL view) are driven from. See booking-monitoring.component.ts / view-booking.component.ts. */
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

/** Flattened row used by the admin monitoring UI — one hotel's reservation + which hotel it came from. */
export interface AdminReservationRow extends ReservationDetailDto {
  hotelName: string;
  hotelId: number;
}
