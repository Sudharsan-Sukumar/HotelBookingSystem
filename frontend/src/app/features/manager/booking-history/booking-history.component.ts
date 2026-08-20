import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ManagerTopNavComponent } from '../../../layout/manager-top-nav/manager-top-nav.component';
import { ManagerHotelScopeService } from '../services/manager-hotel-scope.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HotelReservationsReportDto } from '../../../core/models/manager.model';
import { environment } from '../../../../environments/environment';

/** Rewired to the real reservations report — completed & cancelled stays for the manager's hotel. */
@Component({
  selector: 'app-manager-booking-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ManagerTopNavComponent],
  styleUrl: '../manager-shared.scss',
  template: `
    <app-manager-top-nav></app-manager-top-nav>
    <div class="container-fluid px-4 py-4" style="min-height: calc(100vh - 72px);">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a routerLink="/manager/dashboard" class="text-decoration-none">Home</a></li>
          <li class="breadcrumb-item active text-purple">Booking History</li>
        </ol>
      </nav>
      <h1 class="font-serif fw-bold text-purple h2 mb-1">Booking History</h1>
      <p class="text-secondary small mb-4">Completed and cancelled stays at {{ hotelName() }}.</p>

      @if (noHotel()) {
        <div class="alert alert-warning">No managed hotel could be resolved for your account.</div>
      } @else {

      <div class="card p-3 border mb-4 bg-white shadow-sm" style="border-radius:12px;">
        <select class="form-select form-select-sm w-auto" [(ngModel)]="statusFilter">
          <option value="all">All</option>
          <option value="CheckedOut">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <div class="card border shadow-sm bg-white p-3 mb-4" style="border-radius:12px;">
        <div class="table-responsive">
          <table class="table align-middle manager-premium-table small mb-0">
            <thead><tr><th>Booking ID</th><th>Guest</th><th>Room Type</th><th>Stay Dates</th><th>Status</th><th class="text-end">Amount</th></tr></thead>
            <tbody>
              @for (b of visibleHistory(); track b.bookingCustomId) {
                <tr>
                  <td><strong>{{ b.bookingCustomId }}</strong></td>
                  <td>{{ b.customerName }}</td>
                  <td>{{ b.roomTypeName }}</td>
                  <td>{{ b.checkInDate }} - {{ b.checkOutDate }}</td>
                  <td><span class="badge" [ngClass]="b.status === 'Cancelled' ? 'bg-danger' : 'bg-secondary'">{{ b.status }}</span></td>
                  <td class="text-end fw-bold">₹{{ b.amount | number:'1.0-0' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="text-center text-muted py-4">No historical bookings found.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
      }
    </div>
  `
})
export class BookingHistoryComponent {
  private readonly base = environment.apiUrl;
  statusFilter = 'all';
  readonly noHotel = signal(false);

  private readonly report = signal<HotelReservationsReportDto | null>(null);
  readonly hotelName = computed(() => this.report()?.hotelName ?? null);

  private readonly history = computed(() =>
    (this.report()?.reservations ?? []).filter(b => ['CheckedOut', 'Cancelled'].includes(b.status))
  );

  readonly visibleHistory = computed(() => {
    const list = this.history();
    return this.statusFilter === 'all' ? list : list.filter(b => b.status === this.statusFilter);
  });

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
