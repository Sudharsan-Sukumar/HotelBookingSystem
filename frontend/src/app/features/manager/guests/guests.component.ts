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

interface GuestRow {
  name: string;
  bookingCount: number;
  latestRoomType: string;
  latestStay: string;
  status: string;
}

/**
 * Rewired to the real reservations report. Guests aren't a first-class backend entity here —
 * this dedupes reservations by customerName to build a simple guest directory. Read-only:
 * the "blacklist" mutation from the old mock has no backend support and was removed.
 */
@Component({
  selector: 'app-manager-guests',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ManagerTopNavComponent],
  styleUrl: '../manager-shared.scss',
  template: `
    <app-manager-top-nav></app-manager-top-nav>
    <div class="container-fluid px-4 py-4" style="min-height: calc(100vh - 72px);">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a routerLink="/manager/dashboard" class="text-decoration-none">Home</a></li>
          <li class="breadcrumb-item active text-purple">Guests</li>
        </ol>
      </nav>

      <div class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4 text-start">
        <div>
          <h1 class="font-serif fw-bold text-purple h2 mb-1">Guest Directory</h1>
          <p class="text-secondary small mb-0">Front-office guest registry for {{ hotelName() }}, derived from reservations.</p>
        </div>
      </div>

      @if (noHotel()) {
        <div class="alert alert-warning">No managed hotel could be resolved for your account.</div>
      } @else {

      <div class="card p-3 border mb-4 bg-white shadow-sm" style="border-radius:12px;">
        <div class="row g-2 align-items-end text-start">
          <div class="col-md-8">
            <label class="form-label small fw-semibold text-purple">Search</label>
            <input type="text" class="form-control form-control-sm" placeholder="Guest name..." [(ngModel)]="search">
          </div>
          <div class="col-md-4"><button class="btn btn-outline-purple btn-sm w-100" (click)="resetFilters()">Reset</button></div>
        </div>
      </div>

      <div class="card border shadow-sm bg-white p-3 mb-4" style="border-radius:12px;">
        <div class="table-responsive">
          <table class="table align-middle manager-premium-table small mb-0">
            <thead><tr><th>Guest</th><th>Bookings</th><th>Latest Room Type</th><th>Latest Stay</th><th>Latest Status</th></tr></thead>
            <tbody>
              @for (g of visibleGuests(); track g.name) {
                <tr>
                  <td><strong class="d-block">{{ g.name }}</strong></td>
                  <td>{{ g.bookingCount }}</td>
                  <td>{{ g.latestRoomType }}</td>
                  <td>{{ g.latestStay }}</td>
                  <td><span class="badge" [ngClass]="statusBadgeClass(g.status)">{{ g.status }}</span></td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="text-center text-muted py-4">No guests match the current filters.</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
      }
    </div>
  `
})
export class GuestsComponent {
  private readonly base = environment.apiUrl;
  search = '';
  readonly noHotel = signal(false);

  private readonly report = signal<HotelReservationsReportDto | null>(null);
  readonly hotelName = computed(() => this.report()?.hotelName ?? null);

  readonly guests = computed<GuestRow[]>(() => {
    const reservations = this.report()?.reservations ?? [];
    const byName = new Map<string, GuestRow>();
    for (const r of reservations) {
      const existing = byName.get(r.customerName);
      if (existing) {
        existing.bookingCount++;
        // Keep the row aligned to whichever reservation sorts latest by check-in date.
        if (r.checkInDate > existing.latestStay) {
          existing.latestRoomType = r.roomTypeName;
          existing.latestStay = r.checkInDate;
          existing.status = r.status;
        }
      } else {
        byName.set(r.customerName, {
          name: r.customerName,
          bookingCount: 1,
          latestRoomType: r.roomTypeName,
          latestStay: r.checkInDate,
          status: r.status
        });
      }
    }
    return Array.from(byName.values());
  });

  readonly visibleGuests = computed(() => {
    const q = this.search.trim().toLowerCase();
    let list = this.guests();
    if (q) list = list.filter(g => g.name.toLowerCase().includes(q));
    return list;
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

  statusBadgeClass(status: string): string {
    switch (status) {
      case 'CheckedIn': return 'bg-success';
      case 'Confirmed': return 'bg-primary';
      case 'CheckedOut': return 'bg-secondary';
      case 'Cancelled': return 'bg-danger';
      default: return 'bg-dark';
    }
  }

  resetFilters(): void {
    this.search = '';
  }
}
