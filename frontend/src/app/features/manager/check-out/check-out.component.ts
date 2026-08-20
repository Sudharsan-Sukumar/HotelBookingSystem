import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ManagerTopNavComponent } from '../../../layout/manager-top-nav/manager-top-nav.component';
import { ManagerHotelScopeService } from '../services/manager-hotel-scope.service';
import { ManagerReservationsService } from '../../../core/services/manager-reservations.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HotelReservationsReportDto } from '../../../core/models/manager.model';
import { environment } from '../../../../environments/environment';

/**
 * Rewired to PUT /api/bookings/{id}/check-out. Lists checked-in (in-house) bookings at the
 * manager's hotel (via GET /api/reports/manager/reservations/{hotelId}) with a "Complete Check-out"
 * action per row; the list refreshes from the same report after a successful mutation.
 */
@Component({
  selector: 'app-manager-check-out',
  standalone: true,
  imports: [CommonModule, RouterLink, ManagerTopNavComponent],
  styleUrl: '../manager-shared.scss',
  template: `
    <app-manager-top-nav></app-manager-top-nav>
    <div class="container-fluid px-4 py-4" style="min-height: calc(100vh - 72px);">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a routerLink="/manager/dashboard" class="text-decoration-none">Home</a></li>
          <li class="breadcrumb-item active text-purple">Check-Out</li>
        </ol>
      </nav>
      <h1 class="font-serif fw-bold text-purple h2 mb-1">Guest Check-Out</h1>
      <p class="text-secondary small mb-4">Guests currently in-house at {{ hotelName() }}.</p>

      @if (noHotel()) {
        <div class="alert alert-warning">No managed hotel could be resolved for your account.</div>
      } @else {

      <div class="card border shadow-sm bg-white p-3 mb-4" style="border-radius:12px;">
        <div class="table-responsive">
          <table class="table align-middle manager-premium-table small mb-0">
            <thead><tr><th>Booking ID</th><th>Guest</th><th>Room Type</th><th>Check-out Date</th><th class="text-end">Bill</th><th class="text-end">Status</th><th class="text-end">Action</th></tr></thead>
            <tbody>
              @for (b of checkedInBookings(); track b.id) {
                <tr>
                  <td><strong>{{ b.bookingCustomId }}</strong></td>
                  <td>{{ b.customerName }}</td>
                  <td>{{ b.roomTypeName }}</td>
                  <td>{{ b.checkOutDate }}</td>
                  <td class="text-end fw-bold">₹{{ b.amount | number:'1.0-0' }}</td>
                  <td class="text-end"><span class="badge bg-info text-dark">{{ b.status }}</span></td>
                  <td class="text-end">
                    <button type="button" class="btn btn-sm btn-purple" [disabled]="submittingId() === b.id" (click)="checkOut(b.id)">
                      @if (submittingId() === b.id) {
                        <span class="spinner-border spinner-border-sm me-1"></span>
                      }
                      Complete Check-Out
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="text-center text-muted py-4">No guests currently in-house.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
      }
    </div>
  `
})
export class CheckOutComponent {
  private readonly base = environment.apiUrl;
  private readonly reservationsApi = inject(ManagerReservationsService);
  private readonly ui = inject(GlobalUiService);

  readonly noHotel = signal(false);
  readonly submittingId = signal<number | null>(null);
  private readonly report = signal<HotelReservationsReportDto | null>(null);
  readonly hotelName = computed(() => this.report()?.hotelName ?? null);

  readonly checkedInBookings = computed(() =>
    (this.report()?.reservations ?? []).filter(b => b.status === 'CheckedIn')
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

  checkOut(bookingId: number): void {
    if (this.submittingId() !== null) return;
    this.submittingId.set(bookingId);
    this.reservationsApi.checkOut(bookingId).subscribe({
      next: (res) => {
        this.submittingId.set(null);
        this.ui.showToast(res.message || 'Booking checked out successfully.');
        this.load();
      },
      error: (err: HttpErrorResponse) => {
        this.submittingId.set(null);
        this.ui.showToast(err?.error?.message || 'Failed to check out booking.');
      }
    });
  }
}
