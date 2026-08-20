import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { HotelResponseDto } from '../models/hotel.model';
import { AdminReservationRow, HotelReservationsReportDto } from '../models/admin-reservation.model';
import { AdminCancelBookingDto, BookingResponseDto } from '../models/booking.model';

/**
 * Aggregates GET /api/reports/admin/hotel-reservations/{hotelId} across every hotel so the admin
 * booking-monitoring screen can show a system-wide list — there is no single "all bookings"
 * endpoint on the backend, only this per-hotel report (Admin Edge Case #16, paginated).
 */
@Injectable({ providedIn: 'root' })
export class AdminReservationsService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllReservations(pageSize = 500): Observable<AdminReservationRow[]> {
    return this.http.get<ApiResponse<HotelResponseDto[]>>(`${this.base}/hotels`).pipe(
      map(res => (res.data || []).filter(h => h.isActive)),
      switchMap(hotels => {
        if (!hotels.length) return of([] as AdminReservationRow[][]);
        return forkJoin(
          hotels.map(h =>
            this.http
              .get<ApiResponse<HotelReservationsReportDto>>(
                `${this.base}/reports/admin/hotel-reservations/${h.id}?page=1&pageSize=${pageSize}`
              )
              .pipe(
                map(r => (r.data?.reservations || []).map(res => ({ ...res, hotelName: r.data.hotelName, hotelId: h.id }))),
                catchError(() => of([] as AdminReservationRow[]))
              )
          )
        );
      }),
      map(rowsPerHotel => rowsPerHotel.flat())
    );
  }

  /** Fetches the reservations report for one hotel and flattens it into rows, same shape as
   * getAllReservations() but scoped to a single hotel (used to resolve a single booking by id
   * without re-aggregating every hotel when the caller already knows which hotel it's in). */
  getReservationsForHotel(hotelId: number, pageSize = 500): Observable<AdminReservationRow[]> {
    return this.http
      .get<ApiResponse<HotelReservationsReportDto>>(
        `${this.base}/reports/admin/hotel-reservations/${hotelId}?page=1&pageSize=${pageSize}`
      )
      .pipe(
        map(r => (r.data?.reservations || []).map(res => ({ ...res, hotelName: r.data.hotelName, hotelId }))),
        catchError(() => of([] as AdminReservationRow[]))
      );
  }

  /** Resolves a single booking row by its numeric id. If hotelId is known, scopes the lookup to
   * that hotel's report; otherwise falls back to scanning every hotel (there is still no admin
   * fetch-by-id endpoint on the backend). */
  findReservationById(bookingId: number, hotelId?: number): Observable<AdminReservationRow | null> {
    const source = hotelId != null ? this.getReservationsForHotel(hotelId) : this.getAllReservations();
    return source.pipe(map(rows => rows.find(r => r.id === bookingId) ?? null));
  }

  cancelBooking(id: number, dto: AdminCancelBookingDto): Observable<ApiResponse<BookingResponseDto>> {
    return this.http.post<ApiResponse<BookingResponseDto>>(`${this.base}/admin/bookings/${id}/cancel`, dto);
  }

  /** GET /api/admin/bookings/{id}/invoice — same invoice CSV the customer downloads from My
   * Bookings, resolved by booking id alone (no owner check) since an admin can view any booking. */
  downloadInvoice(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/admin/bookings/${id}/invoice`, { responseType: 'blob' });
  }
}
