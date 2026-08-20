import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../../layout/navbar/navbar.component';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { BookingResponseDto } from '../../../core/models/booking.model';
import { BookingWorkflowStore } from '../store/booking-workflow.store';

/**
 * Real-backend version. Identifies "the" just-confirmed booking by re-fetching
 * GET /api/bookings/{id} using `hbs_last_booking_id` (set by payment-portal right before
 * navigating here) — a fresh fetch rather than trusting stale client state, since the backend
 * is the source of truth for status/rowVersion after payment.
 *
 * Write-a-review entry point: rendered only when this booking's own status is Completed/
 * CheckedOut (a booking is never auto-completed right after payment — it starts "Confirmed" —
 * so in the normal immediate-post-payment flow this section will simply not show; it exists here
 * so that if a user is later routed back to this page for an old, now-completed booking the entry
 * point is present). This is the PRIMARY placement per the migration brief (bookings domain owns
 * it); the candidate/my-bookings page (owned by a different, concurrent workstream) may also want
 * a similar prompt for its list of past bookings — flagged in the final report to avoid duplicate work.
 */
@Component({
  selector: 'app-booking-success',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './booking-success.component.html',
  styleUrl: './booking-success.component.scss'
})
export class BookingSuccessComponent implements OnInit {
  private readonly base = environment.apiUrl;

  booking: BookingResponseDto | null = null;

  bookingRefText = '';
  successBannerText = '';
  successHotelImg = '/assets/images/hotel_cbe.png';
  successHotelName = '';
  successHotelBranchRoom = '';
  successCheckInDate = '';
  successCheckInDay = '';
  successCheckOutDate = '';
  successCheckOutDay = '';
  successDuration = '';
  successGuests = '';
  successRooms = '1 Room';
  payMethodText = '';
  successTotalAmount = '';
  txnIdText = '';
  successEmail = '';

  downloadingInvoice = false;
  canReviewNow = false;
  private hotelIdForReview: number | null = null;

  private readonly bookingStore = inject(BookingWorkflowStore);

  constructor(private http: HttpClient, private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    const bookingId = this.bookingStore.lastBookingId();
    if (!bookingId) {
      this.router.navigate(['/hotels/search']);
      return;
    }

    this.http.get<ApiResponse<BookingResponseDto>>(`${this.base}/bookings/${bookingId}`).subscribe({
      next: (res) => this.applyBooking(res.data),
      error: () => this.router.navigate(['/hotels/search'])
    });
  }

  private applyBooking(booking: BookingResponseDto): void {
    this.booking = booking;

    // BookingResponseDto has no hotelId field — recover it from the (still-present) booking-flow
    // selection state before we clear it below, so "Write a Review" can deep-link to the hotel page.
    this.hotelIdForReview = this.bookingStore.selection()?.hotelId ?? null;

    this.bookingRefText = booking.bookingCustomId || `#${booking.id}`;
    this.successBannerText = `Confirmed stay record at ${booking.hotelName} for ${new Date(booking.checkInDate).toLocaleDateString()}.`;
    this.successHotelName = booking.hotelName;
    this.successHotelBranchRoom = `${booking.roomTypeName} Room`;

    const ci = new Date(booking.checkInDate);
    const co = new Date(booking.checkOutDate);
    this.successCheckInDate = ci.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    this.successCheckInDay = ci.toLocaleDateString('en-US', { weekday: 'long' });
    this.successCheckOutDate = co.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    this.successCheckOutDay = co.toLocaleDateString('en-US', { weekday: 'long' });

    const nights = Math.round((co.getTime() - ci.getTime()) / 86400000);
    this.successDuration = `${nights} Night${nights > 1 ? 's' : ''}`;
    this.successRooms = `${booking.numberOfRooms} Room${booking.numberOfRooms > 1 ? 's' : ''}`;
    this.successGuests = ''; // backend response has no guest-count field; omitted rather than guessed

    this.payMethodText = 'Paid via Razorpay';
    this.successTotalAmount = booking.totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    this.txnIdText = booking.bookingCustomId || String(booking.id);
    this.successEmail = this.auth.userEmail;

    this.canReviewNow = booking.status === 'Completed' || booking.status === 'CheckedOut';

    // Clear booking flow state now that the booking is confirmed — a stale selection/guest/payment
    // state must never leak into the next, unrelated booking.
    sessionStorage.removeItem('hbs_booking_search');
    this.bookingStore.reset();
  }

  viewBookingsLog(): void {
    this.router.navigate(['/candidate/my-bookings']);
  }

  downloadInvoice(): void {
    if (!this.booking) return;
    this.downloadingInvoice = true;
    this.http.get(`${this.base}/bookings/${this.booking.id}/invoice`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.downloadingInvoice = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${this.booking!.id}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => { this.downloadingInvoice = false; }
    });
  }

  goToReview(): void {
    if (!this.booking || !this.hotelIdForReview) return;
    this.router.navigate(['/hotels', this.hotelIdForReview], { queryParams: { reviewBookingId: this.booking.id } });
  }

  returnToDashboard(): void {
    this.router.navigate(['/']);
  }
}
