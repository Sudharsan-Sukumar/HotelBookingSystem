import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { CustomerBookingSummaryDto, CustomerTransactionReportDto } from '../models/customer-report.model';

/** Real HTTP client for Features/Reports/Controllers/CustomerReportsController.cs
 *  (customer's own booking summary + payment/refund transaction history). */
@Injectable({ providedIn: 'root' })
export class CustomerReportsService {
  private readonly base = `${environment.apiUrl}/reports/customer`;

  constructor(private http: HttpClient) {}

  getBookingsSummary(): Observable<ApiResponse<CustomerBookingSummaryDto[]>> {
    return this.http.get<ApiResponse<CustomerBookingSummaryDto[]>>(`${this.base}/bookings`);
  }

  getTransactions(startDate?: string, endDate?: string): Observable<ApiResponse<CustomerTransactionReportDto[]>> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);
    return this.http.get<ApiResponse<CustomerTransactionReportDto[]>>(`${this.base}/transactions`, { params });
  }
}
