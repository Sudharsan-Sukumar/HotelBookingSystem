import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ManagerTopNavComponent } from '../../../layout/manager-top-nav/manager-top-nav.component';
import { ManagerHotelScopeService } from '../services/manager-hotel-scope.service';
import { ApiResponse } from '../../../core/models/api-response.model';
import { HotelReservationsReportDto, ReservationDetailDto } from '../../../core/models/manager.model';
import { environment } from '../../../../environments/environment';

type TabKey = 'all' | 'checkin' | 'checkout';

/**
 * Manager booking management — rewired to the real reservations report endpoint.
 * READ-ONLY: the backend has no manager-facing status-mutation endpoint (no check-in/
 * check-out/cancel for managers), so all former action buttons were removed. A "View"
 * button remains for the detail modal.
 */
@Component({
  selector: 'app-manager-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ManagerTopNavComponent],
  styleUrl: '../manager-shared.scss',
  template: `
    <app-manager-top-nav></app-manager-top-nav>
    <div class="container-fluid px-4 py-4" style="min-height: calc(100vh - 72px);">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a routerLink="/manager/dashboard" class="text-decoration-none">Home</a></li>
          <li class="breadcrumb-item active text-purple">Bookings</li>
        </ol>
      </nav>

      <div class="d-flex justify-content-between align-items-start align-items-md-center flex-column flex-md-row gap-3 mb-4">
        <div>
          <h1 class="font-serif fw-bold text-purple h2 mb-1">Booking Management</h1>
          <p class="text-secondary small mb-0">Read-only view of reservations at {{ hotelName() || 'your hotel' }}.</p>
        </div>
        <button class="btn btn-outline-purple btn-sm d-flex align-items-center gap-2 px-3" (click)="refresh()">
          <i class="bi bi-arrow-clockwise text-warning"></i> Refresh
        </button>
      </div>

      <div class="alert alert-info small">
        <i class="bi bi-info-circle me-1"></i> This page is informational only. The current backend does not provide a manager-facing
        way to check guests in/out or cancel bookings, so no action buttons are shown here.
      </div>

      @if (noHotel()) {
        <div class="alert alert-warning">No managed hotel could be resolved for your account.</div>
      } @else {

      <div class="row g-3 mb-4">
        <div class="col-6 col-md-4 col-lg-2">
          <div class="kpi-card p-3"><span class="text-secondary small d-block">Total Bookings</span><strong class="fs-5 text-dark">{{ hotelBookings().length }}</strong></div>
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <div class="kpi-card p-3"><span class="text-secondary small d-block">Check-ins Today</span><strong class="fs-5 text-dark">{{ checkinCandidates().length }}</strong></div>
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <div class="kpi-card p-3"><span class="text-secondary small d-block">Check-outs Today</span><strong class="fs-5 text-dark">{{ checkoutCandidates().length }}</strong></div>
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <div class="kpi-card p-3"><span class="text-secondary small d-block">Pending Confirm</span><strong class="fs-5 text-dark">{{ pendingCount() }}</strong></div>
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <div class="kpi-card p-3"><span class="text-secondary small d-block">Cancelled</span><strong class="fs-5 text-dark">{{ cancelledCount() }}</strong></div>
        </div>
      </div>

      <ul class="nav nav-tabs mb-3">
        <li class="nav-item"><a class="nav-link" [class.active]="activeTab()==='all'" href="#" (click)="setTab('all', $event)">All Bookings</a></li>
        <li class="nav-item"><a class="nav-link" [class.active]="activeTab()==='checkin'" href="#" (click)="setTab('checkin', $event)">Check-in Queue</a></li>
        <li class="nav-item"><a class="nav-link" [class.active]="activeTab()==='checkout'" href="#" (click)="setTab('checkout', $event)">Check-out Queue</a></li>
      </ul>

      <div class="card p-3 border mb-4 shadow-sm bg-white" style="border-radius:12px;">
        <div class="row g-2 align-items-end">
          <div class="col-12 col-md-4">
            <label class="form-label small fw-semibold text-purple">Search</label>
            <input type="text" class="form-control form-control-sm" placeholder="Booking ID, Guest..." [(ngModel)]="search">
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small fw-semibold text-purple">Booking Status</label>
            <select class="form-select form-select-sm" [(ngModel)]="statusFilter">
              <option value="all">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="CheckedIn">Checked In</option>
              <option value="CheckedOut">Checked Out</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div class="col-6 col-md-2">
            <button class="btn btn-outline-purple btn-sm w-100" (click)="resetFilters()">Reset</button>
          </div>
        </div>
      </div>

      <div class="card border shadow-sm bg-white p-3 mb-4" style="border-radius:12px;">
        <div class="table-responsive">
          <table class="table align-middle manager-premium-table small mb-0">
            <thead>
              <tr>
                <th>Booking ID</th><th>Guest</th><th>Room Type</th><th>Check-in</th><th>Check-out</th>
                <th>Status</th><th class="text-end">Amount</th><th class="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (b of visibleBookings(); track b.bookingCustomId) {
                <tr>
                  <td><strong>{{ b.bookingCustomId }}</strong></td>
                  <td>{{ b.customerName }}</td>
                  <td>{{ b.roomTypeName }}</td>
                  <td>{{ b.checkInDate }}</td>
                  <td>{{ b.checkOutDate }}</td>
                  <td><span class="badge" [ngClass]="statusBadgeClass(b.status)">{{ b.status }}</span></td>
                  <td class="text-end fw-bold">₹{{ b.amount | number:'1.0-0' }}</td>
                  <td class="text-end text-nowrap">
                    <button class="btn btn-sm btn-outline-primary" (click)="viewDetail(b)">View</button>
                  </td>
                </tr>
              }
              @empty {
                <tr><td colspan="8" class="text-center py-5">
                  <i class="bi bi-journal-x text-muted mb-2 d-block" style="font-size:2.5rem;"></i>
                  <h6 class="text-purple fw-bold mb-1">No bookings match the current view</h6>
                </td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      @if (selectedBooking(); as b) {
        <div class="modal-backdrop-manual" style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1050;" (click)="selectedBooking.set(null)">
          <div class="card shadow border border-warning mx-auto mt-5" style="max-width:640px;border-radius:12px;background:#FAF8F4;" (click)="$event.stopPropagation()">
            <div class="p-3 text-white d-flex justify-content-between" style="background-color:#1A0A2E;border-radius:12px 12px 0 0;">
              <h5 class="m-0 font-serif fw-bold">Booking Details</h5>
              <button class="btn-close btn-close-white" (click)="selectedBooking.set(null)"></button>
            </div>
            <div class="p-4 small">
              <p class="mb-1"><strong>Guest:</strong> {{ b.customerName }}</p>
              <p class="mb-1"><strong>Room Type:</strong> {{ b.roomTypeName }}</p>
              <p class="mb-1"><strong>Stay:</strong> {{ b.checkInDate }} to {{ b.checkOutDate }}</p>
              <p class="mb-1"><strong>Status:</strong> {{ b.status }}</p>
              <p class="mb-0"><strong>Amount:</strong> ₹{{ b.amount | number:'1.0-0' }}</p>
            </div>
          </div>
        </div>
      }
      }
    </div>
  `
})
export class BookingsComponent {
  private readonly base = environment.apiUrl;
  readonly activeTab = signal<TabKey>('all');
  search = '';
  statusFilter = 'all';
  readonly selectedBooking = signal<ReservationDetailDto | null>(null);
  readonly noHotel = signal(false);

  private readonly report = signal<HotelReservationsReportDto | null>(null);
  readonly hotelName = computed(() => this.report()?.hotelName ?? null);
  readonly hotelBookings = computed(() => this.report()?.reservations ?? []);

  private readonly todayStr = new Date().toISOString().slice(0, 10);
  readonly checkinCandidates = computed(() => this.hotelBookings().filter(b => b.status === 'Confirmed'));
  readonly checkoutCandidates = computed(() => this.hotelBookings().filter(b => b.status === 'CheckedIn'));
  readonly pendingCount = computed(() => this.hotelBookings().filter(b => b.status.startsWith('Pending')).length);
  readonly cancelledCount = computed(() => this.hotelBookings().filter(b => b.status === 'Cancelled').length);

  readonly visibleBookings = computed(() => {
    let list = this.hotelBookings();
    if (this.activeTab() === 'checkin') list = this.checkinCandidates();
    else if (this.activeTab() === 'checkout') list = this.checkoutCandidates();

    const q = this.search.trim().toLowerCase();
    if (q) {
      list = list.filter(b => b.bookingCustomId.toLowerCase().includes(q) || b.customerName.toLowerCase().includes(q));
    }
    if (this.statusFilter !== 'all') {
      list = list.filter(b => b.status === this.statusFilter);
    }
    return list;
  });

  private hotelId: number | null = null;

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
    this.hotelId = hotel.id;
    await this.fetchReport();
  }

  private async fetchReport(): Promise<void> {
    if (!this.hotelId) return;
    try {
      const res = await firstValueFrom(
        this.http.get<ApiResponse<HotelReservationsReportDto>>(
          `${this.base}/reports/manager/reservations/${this.hotelId}`,
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
      case 'Confirmed': return 'bg-success text-white';
      case 'CheckedIn': return 'bg-info text-dark';
      case 'CheckedOut': return 'bg-secondary text-white';
      case 'Cancelled': return 'bg-danger text-white';
      default: return 'bg-dark text-white';
    }
  }

  setTab(tab: TabKey, event: Event): void {
    event.preventDefault();
    this.activeTab.set(tab);
  }

  resetFilters(): void {
    this.search = '';
    this.statusFilter = 'all';
  }

  refresh(): void {
    this.fetchReport();
  }

  viewDetail(b: ReservationDetailDto): void {
    this.selectedBooking.set(b);
  }
}
