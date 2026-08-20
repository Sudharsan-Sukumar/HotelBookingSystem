import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ManagerTopNavComponent } from '../../../layout/manager-top-nav/manager-top-nav.component';
import { ManagerHotelScopeService } from '../services/manager-hotel-scope.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HotelReservationsReportDto } from '../../../core/models/manager.model';
import { environment } from '../../../../environments/environment';

/** Rewired to the real reservations report — arrivals/departures for the manager's hotel. Read-only. */
@Component({
  selector: 'app-manager-booking-calendar',
  standalone: true,
  imports: [CommonModule, RouterLink, ManagerTopNavComponent],
  styleUrl: '../manager-shared.scss',
  template: `
    <app-manager-top-nav></app-manager-top-nav>
    <div class="container-fluid px-4 py-4" style="min-height: calc(100vh - 72px);">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a routerLink="/manager/dashboard" class="text-decoration-none">Home</a></li>
          <li class="breadcrumb-item active text-purple">Booking Calendar</li>
        </ol>
      </nav>
      <h1 class="font-serif fw-bold text-purple h2 mb-1">Booking Calendar</h1>
      <p class="text-secondary small mb-4">Upcoming arrivals and departures at {{ hotelName() }}.</p>

      @if (noHotel()) {
        <div class="alert alert-warning">No managed hotel could be resolved for your account.</div>
      } @else {

      <div class="row g-4">
        <div class="col-lg-6">
          <div class="card border shadow-sm bg-white p-3" style="border-radius:12px;">
            <h6 class="fw-bold text-purple mb-3"><i class="bi bi-box-arrow-in-right"></i> Upcoming Arrivals</h6>
            <ul class="list-group list-group-flush">
              @for (b of arrivals(); track b.bookingCustomId) {
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  <div><strong>{{ b.bookingCustomId }}</strong><br><span class="text-muted small">{{ b.customerName }}</span></div>
                  <span class="badge bg-primary">{{ b.checkInDate }}</span>
                </li>
              } @empty {
                <li class="list-group-item text-muted small">No upcoming arrivals.</li>
              }
            </ul>
          </div>
        </div>
        <div class="col-lg-6">
          <div class="card border shadow-sm bg-white p-3" style="border-radius:12px;">
            <h6 class="fw-bold text-purple mb-3"><i class="bi bi-box-arrow-right"></i> Upcoming Departures</h6>
            <ul class="list-group list-group-flush">
              @for (b of departures(); track b.bookingCustomId) {
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  <div><strong>{{ b.bookingCustomId }}</strong><br><span class="text-muted small">{{ b.customerName }}</span></div>
                  <span class="badge bg-warning text-dark">{{ b.checkOutDate }}</span>
                </li>
              } @empty {
                <li class="list-group-item text-muted small">No upcoming departures.</li>
              }
            </ul>
          </div>
        </div>
      </div>
      }
    </div>
  `
})
export class BookingCalendarComponent {
  private readonly base = environment.apiUrl;
  readonly noHotel = signal(false);
  private readonly report = signal<HotelReservationsReportDto | null>(null);
  readonly hotelName = computed(() => this.report()?.hotelName ?? null);

  private readonly bookings = computed(() => this.report()?.reservations ?? []);

  readonly arrivals = computed(() =>
    this.bookings()
      .filter(b => b.status === 'Confirmed')
      .sort((a, c) => (a.checkInDate || '').localeCompare(c.checkInDate || ''))
  );

  readonly departures = computed(() =>
    this.bookings()
      .filter(b => b.status === 'CheckedIn')
      .sort((a, c) => (a.checkOutDate || '').localeCompare(c.checkOutDate || ''))
  );

  constructor(
    private http: HttpClient,
    private hotelScope: ManagerHotelScopeService
  ) {
    this.load();
  }

  private async load(): Promise<void> {
    const hotel = await this.hotelScope.getPrimaryHotel();
    if (!hotel) {
      this.noHotel.set(true);
      return;
    }
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<HotelReservationsReportDto>>(
          `${this.base}/reports/manager/reservations/${hotel.id}`,
          { params: { pageSize: 200 } }
        )
      );
      this.report.set(res.data ?? null);
    } catch {
      this.report.set(null);
    }
  }
}
