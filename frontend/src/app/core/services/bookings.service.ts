import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { BookingResponseDto } from '../models/booking.model';

/** Real HTTP client for the read/cancel/invoice parts of Features/Bookings/Controllers/BookingsController.cs
 *  used by the customer-facing "My Bookings" page. Create/Modify flows live with the parallel
 *  Hotels/Booking agent's `features/bookings/*` components — not duplicated here. */
@Injectable({ providedIn: 'root' })
export class MyBookingsService {
  private readonly base = `${environment.apiUrl}/bookings`;

  constructor(private http: HttpClient) {}

  getMyBookings(): Observable<ApiResponse<BookingResponseDto[]>> {
    return this.http.get<ApiResponse<BookingResponseDto[]>>(this.base);
  }

  cancelBooking(id: number): Observable<ApiResponse<BookingResponseDto>> {
    return this.http.post<ApiResponse<BookingResponseDto>>(`${this.base}/${id}/cancel`, {});
  }

  /** Returns the raw CSV bytes — caller saves via Blob + anchor download. */
  downloadInvoice(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/invoice`, { responseType: 'blob' });
  }
}
