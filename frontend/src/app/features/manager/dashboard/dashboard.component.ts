import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ManagerTopNavComponent } from '../../../layout/manager-top-nav/manager-top-nav.component';
import { AuthService } from '../../../core/services/auth.service';
import { ManagerHotelScopeService } from '../services/manager-hotel-scope.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HotelReservationsReportDto } from '../../../core/models/manager.model';
import { environment } from '../../../../environments/environment';

/** Rewired to real data: summary tiles come from HotelReservationsReportDto for the manager's primary hotel. */
@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ManagerTopNavComponent],
  styleUrl: '../manager-shared.scss',
  template: `
    <app-manager-top-nav></app-manager-top-nav>

    <div class="w-100" style="min-height: calc(100vh - 72px);">
      <div class="p-4 main-content-workspace">
        <header class="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-4 text-start">
          <div>
            <h1 class="welcome-heading m-0 font-serif">Welcome back, {{ managerFirstName() }}! &#128075;</h1>
            <p class="welcome-sub text-muted m-0">Here's what's happening at {{ hotelName() || 'your hotel' }} today.</p>
          </div>
        </header>

        @if (loading()) {
          <p class="text-muted">Loading dashboard...</p>
        } @else if (noHotel()) {
          <div class="alert alert-warning">No managed hotel could be resolved for your account. Contact an administrator if this seems wrong.</div>
        } @else {

        <section class="row g-4 mb-4 text-start">
          <div class="col-xl-2 col-md-4 col-sm-6">
            <div class="kpi-card bg-white p-4 rounded border h-100 shadow">
              <div class="d-flex justify-content-between align-items-center">
                <span class="kpi-icon purple"><i class="bi bi-briefcase"></i></span>
              </div>
              <strong class="d-block text-muted small mt-3 uppercase-title">Total Bookings</strong>
              <span class="fs-3 fw-bold text-dark d-block">{{ totalBookings() }}</span>
              <span class="small text-muted mt-1 d-block" style="font-size:0.7rem;">for this hotel</span>
            </div>
          </div>
          <div class="col-xl-2 col-md-4 col-sm-6">
            <div class="kpi-card bg-white p-4 rounded border h-100 shadow">
              <span class="kpi-icon green"><i class="bi bi-people"></i></span>
              <strong class="d-block text-muted small mt-3 uppercase-title">Active Guests</strong>
              <span class="fs-3 fw-bold text-dark d-block">{{ activeGuests() }}</span>
              <span class="small text-muted mt-1 d-block" style="font-size:0.7rem;">Currently checked in</span>
            </div>
          </div>
          <div class="col-xl-2 col-md-4 col-sm-6">
            <div class="kpi-card bg-white p-4 rounded border h-100 shadow">
              <span class="kpi-icon blue"><i class="bi bi-percent"></i></span>
              <strong class="d-block text-muted small mt-3 uppercase-title">Occupancy Rate</strong>
              <span class="fs-3 fw-bold text-dark d-block">{{ occupancyRate() }}%</span>
              <span class="small text-muted mt-1 d-block" style="font-size:0.7rem;">per manager reservations report</span>
            </div>
          </div>
          <div class="col-xl-2 col-md-4 col-sm-6">
            <div class="kpi-card bg-white p-4 rounded border h-100 shadow">
              <span class="kpi-icon orange"><i class="bi bi-box-arrow-in-right"></i></span>
              <strong class="d-block text-muted small mt-3 uppercase-title">Check-ins Today</strong>
              <span class="fs-3 fw-bold text-dark d-block">{{ checkinsToday() }}</span>
              <span class="small text-muted mt-1 d-block" style="font-size:0.7rem;">Scheduled arrivals</span>
            </div>
          </div>
          <div class="col-xl-2 col-md-4 col-sm-6">
            <div class="kpi-card bg-white p-4 rounded border h-100 shadow">
              <span class="kpi-icon red"><i class="bi bi-box-arrow-right"></i></span>
              <strong class="d-block text-muted small mt-3 uppercase-title">Check-outs Today</strong>
              <span class="fs-3 fw-bold text-dark d-block">{{ checkoutsToday() }}</span>
              <span class="small text-muted mt-1 d-block" style="font-size:0.7rem;">Scheduled departures</span>
            </div>
          </div>
          <div class="col-xl-2 col-md-4 col-sm-6">
            <div class="kpi-card bg-white p-4 rounded border h-100 shadow">
              <span class="kpi-icon gold"><i class="bi bi-cash-coin"></i></span>
              <strong class="d-block text-muted small mt-3 uppercase-title">Revenue (Bookings)</strong>
              <span class="fs-3 fw-bold text-dark d-block">₹{{ totalRevenue() | number:'1.0-0' }}</span>
              <span class="small text-muted mt-1 d-block" style="font-size:0.7rem;">all recorded bookings</span>
            </div>
          </div>
        </section>

        <section class="mb-4 text-start">
          <h3 class="font-serif text-dark fs-5 mb-3 fw-bold">Quick Actions</h3>
          <div class="row g-3">
            <div class="col-xl-2 col-md-4 col-sm-6">
              <a routerLink="/manager/check-in" class="btn btn-action-quick w-100 py-3 rounded border text-decoration-none d-block text-center">
                <i class="bi bi-door-open me-2"></i> Check-in Guest
              </a>
            </div>
            <div class="col-xl-2 col-md-4 col-sm-6">
              <a routerLink="/manager/check-out" class="btn btn-action-quick w-100 py-3 rounded border text-decoration-none d-block text-center">
                <i class="bi bi-door-closed me-2"></i> Check-out Guest
              </a>
            </div>
          </div>
        </section>

        <div class="row g-4 text-start mt-2">
          <div class="col-lg-6">
            <div class="bg-white rounded border p-4 h-100 shadow-lg" style="border-color:#ECE6D8!important;border-radius:18px!important;">
              <h2 class="font-serif text-dark fs-5 m-0 mb-3 fw-bold">Recent Reservations</h2>
              @if (recentReservations().length === 0) {
                <p class="text-muted small">No reservations found for this hotel yet.</p>
              }
              <ul class="availability-list ps-0 mb-0 d-flex flex-column gap-3" style="font-size:0.85rem;list-style:none;">
                @for (r of recentReservations(); track r.bookingCustomId) {
                  <li>
                    <div class="d-flex justify-content-between mb-1">
                      <span class="text-secondary">{{ r.bookingCustomId }} — {{ r.customerName }} ({{ r.roomTypeName }})</span>
                      <span class="fw-semibold text-dark">{{ r.status }}</span>
                    </div>
                  </li>
                }
              </ul>
            </div>
          </div>

          <div class="col-lg-6">
            <div class="bg-white rounded border p-4 h-100 shadow-lg text-start" style="border-color:#ECE6D8!important;border-radius:18px!important;">
              <h2 class="font-serif text-dark fs-5 m-0 mb-3 fw-bold">Today's At-a-Glance</h2>
              <div class="row g-4 align-items-center">
                <div class="col-md-5 text-center">
                  <div class="position-relative d-inline-block" style="width:150px;height:150px;">
                    <div class="w-100 h-100 rounded-circle border border-5 d-flex align-items-center justify-content-center border-warning border-opacity-75" style="border-width:8px!important;">
                      <div class="text-center">
                        <span class="fs-2 fw-bold text-dark d-block" style="line-height:1.1;">{{ occupancyRate() }}%</span>
                        <span class="small text-muted d-block" style="font-size:0.75rem;">Occupancy</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-7">
                  <div class="row g-2 mt-2">
                    <div class="col-6">
                      <div class="p-2 rounded border bg-light text-start" style="border-color:#ECE6D8!important;">
                        <span class="text-muted d-block" style="font-size:0.65rem;font-weight:500;">Expected Arrivals</span>
                        <strong class="d-block text-dark fs-5">{{ checkinsToday() }}</strong>
                      </div>
                    </div>
                    <div class="col-6">
                      <div class="p-2 rounded border bg-light text-start" style="border-color:#ECE6D8!important;">
                        <span class="text-muted d-block" style="font-size:0.65rem;font-weight:500;">Expected Departures</span>
                        <strong class="d-block text-dark fs-5">{{ checkoutsToday() }}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        }
      </div>
    </div>
  `
})
export class DashboardComponent {
  private readonly base = environment.apiUrl;
  private readonly hotelId = signal<number | null>(null);
  private readonly report = signal<HotelReservationsReportDto | null>(null);
  readonly loading = signal(true);
  readonly noHotel = signal(false);

  readonly managerFirstName = computed(() => (this.auth.userName || 'Manager').split(' ')[0]);
  readonly hotelName = computed(() => this.report()?.hotelName ?? null);

  readonly totalBookings = computed(() => this.report()?.totalBookings ?? 0);
  readonly totalRevenue = computed(() => this.report()?.totalRevenue ?? 0);
  readonly occupancyRate = computed(() => Math.round(this.report()?.occupancyRatePercentage ?? 0));

  private readonly reservations = computed(() => this.report()?.reservations ?? []);
  readonly recentReservations = computed(() => this.reservations().slice(0, 8));

  private readonly todayStr = new Date().toISOString().slice(0, 10);
  readonly checkinsToday = computed(() => this.reservations().filter(r => (r.checkInDate || '').slice(0, 10) === this.todayStr).length);
  readonly checkoutsToday = computed(() => this.reservations().filter(r => (r.checkOutDate || '').slice(0, 10) === this.todayStr).length);
  readonly activeGuests = computed(() => this.reservations().filter(r => r.status === 'CheckedIn').length);

  constructor(
    private auth: AuthService,
    private http: HttpClient,
    private hotelScope: ManagerHotelScopeService
  ) {
    this.init();
  }

  private async init(): Promise<void> {
    const hotel = await this.hotelScope.getPrimaryHotel();
    if (!hotel) {
      this.noHotel.set(true);
      this.loading.set(false);
      return;
    }
    this.hotelId.set(hotel.id);
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<HotelReservationsReportDto>>(
          `${this.base}/reports/manager/reservations/${hotel.id}`,
          { params: { pageSize: 100 } }
        )
      );
      this.report.set(res.data ?? null);
    } catch {
      this.report.set(null);
    } finally {
      this.loading.set(false);
    }
  }
}
