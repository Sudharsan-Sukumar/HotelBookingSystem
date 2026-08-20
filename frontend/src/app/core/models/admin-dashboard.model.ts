/** Mirrors Features/CMS/DTOs/AdminDashboardDto.cs exactly. GET api/admindashboard/summary. */
export interface AdminDashboardDto {
  totalActiveUsers: number;
  totalRevenue: number;
  activePromotionsCount: number;
  lastBackupStatus: string;
}

/** Mirrors Features/Reports/DTOs/SystemWideBookingsReportDto.cs. GET api/reports/admin/system-bookings. */
export interface HotelPerformanceDto {
  hotelCustomId: string;
  hotelName: string;
  bookingsCount: number;
  revenue: number;
  cancellationRate: number;
  occupancyRate: number;
}

export interface SystemWideBookingsReportDto {
  totalBookings: number;
  totalRevenue: number;
  systemCancellationRate: number;
  averageOccupancyRate: number;
  hotelPerformances: HotelPerformanceDto[];
}
