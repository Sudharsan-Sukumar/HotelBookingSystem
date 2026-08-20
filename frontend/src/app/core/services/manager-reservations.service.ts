import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { BookingResponseDto } from '../models/booking.model';

/**
 * Wraps the manager-facing check-in/check-out mutations on Features/Bookings/BookingsController.cs:
 *   PUT /api/bookings/{id}/check-in   ([Authorize(Roles="Manager")], requires status Confirmed)
 *   PUT /api/bookings/{id}/check-out  ([Authorize(Roles="Manager")], requires status CheckedIn)
 * Both are ownership-checked server-side (403 if the booking's hotel isn't one of the manager's
 * assigned hotels) and return the updated BookingResponseDto in the standard ApiResponse envelope.
 */
@Injectable({ providedIn: 'root' })
export class ManagerReservationsService {
  private readonly base = `${environment.apiUrl}/bookings`;

  constructor(private http: HttpClient) {}

  checkIn(bookingId: number): Observable<ApiResponse<BookingResponseDto>> {
    return this.http.put<ApiResponse<BookingResponseDto>>(`${this.base}/${bookingId}/check-in`, {});
  }

  checkOut(bookingId: number): Observable<ApiResponse<BookingResponseDto>> {
    return this.http.put<ApiResponse<BookingResponseDto>>(`${this.base}/${bookingId}/check-out`, {});
  }
}
