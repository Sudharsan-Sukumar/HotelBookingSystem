import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminTopNavComponent } from '../../../layout/admin-top-nav/admin-top-nav.component';
import { AdminReservationsService } from '../../../core/services/admin-reservations.service';
import { AdminReservationRow } from '../../../core/models/admin-reservation.model';
import { RenderTickService } from '../../../core/services/render-tick.service';

/**
 * Real-data booking detail view.
 *
 * BACKEND LIMITATION: there is still no GET-by-id (or by BookingCustomId) endpoint for admin
 * bookings — only the aggregate GET /api/reports/admin/hotel-reservations/{hotelId} list. So this
 * page resolves the booking by scanning that report: if it was reached via booking-monitoring's
 * "View" button, the hotel context is passed through router state and the lookup is scoped to that
 * one hotel; on a direct URL/refresh (no state available) it falls back to scanning every hotel,
 * same pattern AdminReservationsService.getAllReservations() already uses elsewhere.
 */
@Component({
  selector: 'app-view-booking',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminTopNavComponent],
  templateUrl: './view-booking.component.html',
  styleUrls: ['./view-booking.component.scss']
})
export class ViewBookingComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private reservationsApi = inject(AdminReservationsService);
  private renderTick = inject(RenderTickService);

  booking: AdminReservationRow | null = null;
  notFound = false;
  loading = true;

  ngOnInit(): void {
    const bookingId = Number(this.route.snapshot.paramMap.get('bookingId'));
    if (!bookingId) {
      this.loading = false;
      this.notFound = true;
      return;
    }

    const state = this.router.getCurrentNavigation()?.extras?.state ?? (history.state as any);
    const passedReservation = state?.reservation as AdminReservationRow | undefined;
    const hotelId = state?.hotelId as number | undefined;

    if (passedReservation && passedReservation.id === bookingId) {
      this.booking = passedReservation;
      this.loading = false;
      return;
    }

    this.reservationsApi.findReservationById(bookingId, hotelId).subscribe({
      next: row => {
        this.loading = false;
        this.booking = row;
        this.notFound = !row;
        // Same fix as booking-monitoring.component.ts: when hotelId is unknown (direct URL/refresh),
        // findReservationById() fans out via getAllReservations()'s forkJoin, so the centralized
        // RenderTickService tick from the error interceptor's finalize() fires per raw HTTP request —
        // before this next() callback runs — and the "Loading..." state is never re-rendered away.
        this.renderTick.requestTick();
      },
      error: () => {
        this.loading = false;
        this.notFound = true;
        this.renderTick.requestTick();
      }
    });
  }

  get statusBadgeClass(): string {
    switch (this.booking?.status) {
      case 'Confirmed': return 'bg-success';
      case 'CheckedIn': return 'bg-primary';
      case 'CheckedOut': return 'bg-secondary';
      case 'Completed': return 'bg-secondary';
      case 'Cancelled': return 'bg-danger';
      default: return 'bg-warning text-dark';
    }
  }

  get nights(): number {
    if (!this.booking) return 0;
    const d1 = new Date(this.booking.checkInDate);
    const d2 = new Date(this.booking.checkOutDate);
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
  }

  print(): void {
    window.print();
  }
}
