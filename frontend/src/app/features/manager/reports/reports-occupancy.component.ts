import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ManagerTopNavComponent } from '../../../layout/manager-top-nav/manager-top-nav.component';
import { ManagerHotelScopeService } from '../services/manager-hotel-scope.service';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HotelReservationsReportDto, ReservationDetailDto } from '../../../core/models/manager.model';

/**
 * Rebuilt around HotelReservationsReportDto.occupancyRatePercentage.
 * The DTO has no room-inventory breakdown, so "Total Rooms"/"Occupied"/"Available" counts from the
 * old mock version (which faked a room list) are not honestly derivable and have been removed.
 * The "By Room Type" breakdown is legitimately derived by grouping the real reservations array
 * by roomTypeName and counting bookings per type (not occupancy, since per-room-type occupancy
 * data isn't exposed by this endpoint).
 */
@Component({
  selector: 'app-manager-reports-occupancy',
  standalone: true,
  imports: [CommonModule, RouterLink, ManagerTopNavComponent],
  styleUrl: '../manager-shared.scss',
  template: `
    <app-manager-top-nav></app-manager-top-nav>
    <div class="container-fluid px-4 py-4" style="min-height: calc(100vh - 72px);">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a routerLink="/manager/dashboard" class="text-decoration-none">Home</a></li>
          <li class="breadcrumb-item active text-purple">Occupancy Report</li>
        </ol>
      </nav>
      <h1 class="font-serif fw-bold text-purple h2 mb-4">Occupancy Report</h1>

      @if (loading()) {
        <p class="text-muted">Loading occupancy report...</p>
      } @else if (noHotel()) {
        <div class="card border shadow-sm bg-white p-4 text-center text-muted" style="border-radius:12px;">
          No managed hotel could be resolved for this account.
        </div>
      } @else {
        <div class="row g-3 mb-4">
          <div class="col-6 col-md-4"><div class="kpi-card p-3"><span class="text-secondary small d-block">Total Bookings</span><strong class="fs-4 text-dark">{{ report()?.totalBookings ?? 0 }}</strong></div></div>
          <div class="col-6 col-md-4"><div class="kpi-card p-3"><span class="text-secondary small d-block">Total Revenue</span><strong class="fs-4 text-dark">₹{{ (report()?.totalRevenue ?? 0) | number:'1.0-0' }}</strong></div></div>
          <div class="col-6 col-md-4"><div class="kpi-card p-3"><span class="text-secondary small d-block">Occupancy Rate</span><strong class="fs-4 text-dark">{{ report()?.occupancyRatePercentage ?? 0 }}%</strong></div></div>
        </div>

        <div class="card border shadow-sm bg-white p-4" style="border-radius:12px;">
          <h6 class="fw-bold text-purple mb-3">Bookings By Room Type</h6>
          @for (rt of byType(); track rt.type) {
            <div class="mb-3">
              <div class="d-flex justify-content-between mb-1 small">
                <span>{{ rt.type }} ({{ rt.count }} bookings)</span>
                <strong>{{ rt.pct }}% of total</strong>
              </div>
              <div class="progress" style="height:8px;">
                <div class="progress-bar" [style.width.%]="rt.pct" style="background-color:#D4AF37;"></div>
              </div>
            </div>
          } @empty {
            <p class="text-muted small">No booking data available.</p>
          }
        </div>
      }
    </div>
  `
})
export class ReportsOccupancyComponent implements OnInit {
  private readonly base = environment.apiUrl;

  readonly loading = signal(true);
  readonly noHotel = signal(false);
  readonly report = signal<HotelReservationsReportDto | null>(null);
  readonly reservations = signal<ReservationDetailDto[]>([]);

  readonly byType = signal<{ type: string; count: number; pct: number }[]>([]);

  constructor(private http: HttpClient, private hotelScope: ManagerHotelScopeService) {}

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      const hotel = await this.hotelScope.getPrimaryHotel();
      if (!hotel) {
        this.noHotel.set(true);
        return;
      }
      const res = await firstValueFrom(
        this.http.get<ApiResponse<HotelReservationsReportDto>>(
          `${this.base}/reports/manager/reservations/${hotel.id}`
        )
      );
      this.report.set(res.data);
      const reservations = res.data?.reservations ?? [];
      this.reservations.set(reservations);
      this.byType.set(this.computeByType(reservations));
    } catch {
      this.noHotel.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  private computeByType(reservations: ReservationDetailDto[]): { type: string; count: number; pct: number }[] {
    const counts = new Map<string, number>();
    reservations.forEach(r => {
      const t = r.roomTypeName || 'Unknown';
      counts.set(t, (counts.get(t) ?? 0) + 1);
    });
    const total = reservations.length;
    return Array.from(counts.entries()).map(([type, count]) => ({
      type,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0
    }));
  }
}
