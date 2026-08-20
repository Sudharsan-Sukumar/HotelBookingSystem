import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { AdminDashboardDto, SystemWideBookingsReportDto } from '../models/admin-dashboard.model';

/** Real HTTP client for Features/CMS/Controllers/AdminDashboardController.cs and the
 *  system-bookings slice of Features/Reports/Controllers/AdminReportsController.cs. */
@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getSummary(): Observable<ApiResponse<AdminDashboardDto>> {
    return this.http.get<ApiResponse<AdminDashboardDto>>(`${this.base}/admindashboard/summary`);
  }

  getSystemBookings(): Observable<ApiResponse<SystemWideBookingsReportDto>> {
    return this.http.get<ApiResponse<SystemWideBookingsReportDto>>(`${this.base}/reports/admin/system-bookings`);
  }
}
