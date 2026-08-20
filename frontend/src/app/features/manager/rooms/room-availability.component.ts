import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ManagerTopNavComponent } from '../../../layout/manager-top-nav/manager-top-nav.component';
import { ManagerHotelScopeService } from '../services/manager-hotel-scope.service';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HotelResponseDto, RoomTypeResponseDto } from '../../../core/models/hotel.model';
import { HotelReservationsReportDto } from '../../../core/models/manager.model';

/**
 * Ported from room_availability.html.
 *
 * BACKEND LIMITATION: the API tracks only an aggregate `totalRooms` count per room type -- it
 * has no individually numbered room instances, so a per-room tile grid (as the old mock showed)
 * cannot be honestly reproduced. This page instead shows, per room type: total rooms, a
 * currently-booked count derived from the manager reservations report (bookings with status
 * Confirmed/CheckedIn whose date range includes today), and the remainder as "available". This
 * is an approximation of true live availability (it doesn't know which specific room number is
 * free) but every number shown is real data, not fabricated.
 */
@Component({
  selector: 'app-manager-room-availability',
  standalone: true,
  imports: [CommonModule, RouterLink, ManagerTopNavComponent],
  styleUrl: '../manager-shared.scss',
  template: `
    <app-manager-top-nav></app-manager-top-nav>
    <div class="container-fluid px-4 py-4" style="min-height: calc(100vh - 72px);">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a routerLink="/manager/dashboard" class="text-decoration-none">Home</a></li>
          <li class="breadcrumb-item active text-purple">Room Availability</li>
        </ol>
      </nav>

      @if (loading()) {
        <div class="text-center text-muted py-5"><div class="spinner-border text-purple"></div></div>
      } @else if (!hotel()) {
        <div class="card border shadow-sm bg-white p-5 text-center" style="border-radius:12px;">
          <i class="bi bi-building-x fs-1 text-muted mb-2"></i>
          <h5 class="fw-bold text-purple">No hotel assigned</h5>
          <p class="text-secondary small mb-0">We couldn't verify a hotel managed by your account. Contact an administrator.</p>
        </div>
      } @else {
        <h1 class="font-serif fw-bold text-purple h2 mb-1">Room Availability</h1>
        <p class="text-secondary small mb-3">Snapshot for {{ hotel()?.name }} — totals per room type, based on today's confirmed reservations.</p>

        <div class="d-flex flex-wrap gap-2 mb-4 small">
          <span class="badge bg-light text-dark border p-2"><span class="legend-indicator bg-success me-2"></span>{{ totalAvailable() }} Available</span>
          <span class="badge bg-light text-dark border p-2"><span class="legend-indicator bg-danger me-2"></span>{{ totalOccupied() }} Occupied (today)</span>
          <span class="badge bg-light text-dark border p-2"><span class="legend-indicator bg-secondary me-2"></span>{{ totalMaintenance() }} Under Maintenance</span>
        </div>

        <div class="card border shadow-sm bg-white p-4" style="border-radius:12px;">
          <div class="row g-3">
            @for (rt of roomTypeAvailability(); track rt.id) {
              <div class="col-6 col-md-4 col-lg-3">
                <div class="card border shadow-sm p-3 d-flex flex-column align-items-center justify-content-center text-center" style="border-radius:12px;">
                  <strong class="text-dark">{{ rt.name }}</strong>
                  @if (rt.isUnderMaintenance) {
                    <span class="badge bg-secondary text-uppercase mt-1" style="font-size:0.6rem;">Maintenance</span>
                  } @else {
                    <span class="text-muted small mt-1">{{ rt.available }} / {{ rt.totalRooms }} available</span>
                    <span class="text-muted small">{{ rt.occupiedToday }} booked today</span>
                  }
                </div>
              </div>
            } @empty {
              <div class="w-100 text-center text-muted py-5">No room types found for this property.</div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class RoomAvailabilityComponent implements OnInit {
  private readonly base = environment.apiUrl;

  readonly loading = signal(true);
  readonly hotel = signal<HotelResponseDto | null>(null);
  readonly roomTypes = signal<RoomTypeResponseDto[]>([]);
  readonly occupiedTodayByRoomTypeName = signal<Map<string, number>>(new Map());

  constructor(
    private http: HttpClient,
    private scope: ManagerHotelScopeService
  ) {}

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    const hotel = await this.scope.getPrimaryHotel();
    this.hotel.set(hotel);
    if (hotel) {
      await Promise.all([this.loadRoomTypes(hotel.id), this.loadOccupancyToday(hotel.id)]);
    }
    this.loading.set(false);
  }

  private async loadRoomTypes(hotelId: number): Promise<void> {
    try {
      const res = await firstValueFrom(this.http.get<ApiResponse<RoomTypeResponseDto[]>>(`${this.base}/hotels/${hotelId}/roomtypes`));
      this.roomTypes.set(res.data ?? []);
    } catch {
      this.roomTypes.set([]);
    }
  }

  private async loadOccupancyToday(hotelId: number): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<HotelReservationsReportDto>>(`${this.base}/reports/manager/reservations/${hotelId}`, {
          params: { pageSize: 500 }
        })
      );
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const counts = new Map<string, number>();
      for (const r of res.data?.reservations ?? []) {
        const checkIn = new Date(r.checkInDate);
        const checkOut = new Date(r.checkOutDate);
        const activeStatus = r.status === 'Confirmed' || r.status === 'CheckedIn';
        if (activeStatus && checkIn <= today && checkOut > today) {
          counts.set(r.roomTypeName, (counts.get(r.roomTypeName) ?? 0) + 1);
        }
      }
      this.occupiedTodayByRoomTypeName.set(counts);
    } catch {
      this.occupiedTodayByRoomTypeName.set(new Map());
    }
  }

  roomTypeAvailability() {
    const occupancy = this.occupiedTodayByRoomTypeName();
    return this.roomTypes().map(rt => {
      const occupiedToday = Math.min(rt.totalRooms, occupancy.get(rt.name) ?? 0);
      return {
        ...rt,
        occupiedToday,
        available: Math.max(0, rt.totalRooms - occupiedToday)
      };
    });
  }

  totalAvailable(): number {
    return this.roomTypeAvailability()
      .filter(rt => !rt.isUnderMaintenance)
      .reduce((sum, rt) => sum + rt.available, 0);
  }

  totalOccupied(): number {
    return this.roomTypeAvailability().reduce((sum, rt) => sum + rt.occupiedToday, 0);
  }

  totalMaintenance(): number {
    return this.roomTypes().filter(rt => rt.isUnderMaintenance).reduce((sum, rt) => sum + rt.totalRooms, 0);
  }
}
