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
 * Rebuilt around HotelReservationsReportDto. There is NO manager-scoped payments/transactions
 * endpoint (that's Customer/Admin scoped) — no payment method, transaction ID, or refund
 * breakdown is available to a Manager. This page is simplified honestly to the only real
 * payment-adjacent fields the backend exposes per booking: amount and status. The old mock
 * "Payment Method" column and "Paid/Pending/Refunded" counts (which relied on a fictitious
 * b.paymentMethod/b.paymentStatus) have been removed; booking status is shown instead, and the
 * revenue figure comes directly from totalRevenue on the DTO.
 */
@Component({
  selector: 'app-manager-reports-payments',
  standalone: true,
  imports: [CommonModule, RouterLink, ManagerTopNavComponent],
  styleUrl: '../manager-shared.scss',
  template: `
    <app-manager-top-nav></app-manager-top-nav>
    <div class="container-fluid px-4 py-4" style="min-height: calc(100vh - 72px);">
      <nav aria-label="breadcrumb">
        <ol class="breadcrumb">
          <li class="breadcrumb-item"><a routerLink="/manager/dashboard" class="text-decoration-none">Home</a></li>
          <li class="breadcrumb-item active text-purple">Payment Report</li>
        </ol>
      </nav>
      <h1 class="font-serif fw-bold text-purple h2 mb-4">Payment Report</h1>
      <p class="text-muted small">Managers do not have access to a dedicated transactions endpoint; figures below are derived from booking amounts and statuses.</p>

      @if (loading()) {
        <p class="text-muted">Loading payment report...</p>
      } @else if (noHotel()) {
        <div class="card border shadow-sm bg-white p-4 text-center text-muted" style="border-radius:12px;">
          No managed hotel could be resolved for this account.
        </div>
      } @else {
        <div class="row g-3 mb-4">
          <div class="col-6 col-md-3"><div class="kpi-card p-3"><span class="text-secondary small d-block">Total Revenue</span><strong class="fs-4 text-dark">₹{{ (report()?.totalRevenue ?? 0) | number:'1.0-0' }}</strong></div></div>
          <div class="col-6 col-md-3"><div class="kpi-card p-3"><span class="text-secondary small d-block">Confirmed</span><strong class="fs-4 text-dark">{{ countByStatus('Confirmed') }}</strong></div></div>
          <div class="col-6 col-md-3"><div class="kpi-card p-3"><span class="text-secondary small d-block">Cancelled</span><strong class="fs-4 text-dark">{{ countByStatus('Cancelled') }}</strong></div></div>
          <div class="col-6 col-md-3"><div class="kpi-card p-3"><span class="text-secondary small d-block">Checked Out</span><strong class="fs-4 text-dark">{{ countByStatus('CheckedOut') }}</strong></div></div>
        </div>

        <div class="card border shadow-sm bg-white p-3" style="border-radius:12px;">
          <div class="table-responsive">
            <table class="table align-middle manager-premium-table small mb-0">
              <thead><tr><th>Booking ID</th><th>Guest</th><th>Status</th><th class="text-end">Amount</th></tr></thead>
              <tbody>
                @for (b of reservations(); track b.bookingCustomId) {
                  <tr>
                    <td><strong>{{ b.bookingCustomId }}</strong></td>
                    <td>{{ b.customerName }}</td>
                    <td><span class="badge" [ngClass]="b.status === 'Cancelled' ? 'bg-danger' : 'bg-success'">{{ b.status }}</span></td>
                    <td class="text-end">₹{{ b.amount | number:'1.0-0' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="text-center text-muted py-4">No payment records found.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `
})
export class ReportsPaymentsComponent implements OnInit {
  private readonly base = environment.apiUrl;

  readonly loading = signal(true);
  readonly noHotel = signal(false);
  readonly report = signal<HotelReservationsReportDto | null>(null);
  readonly reservations = signal<ReservationDetailDto[]>([]);

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
      this.reservations.set(res.data?.reservations ?? []);
    } catch {
      this.noHotel.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  countByStatus(status: string): number {
    return this.reservations().filter(r => r.status === status).length;
  }
}
