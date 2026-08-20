import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../layout/navbar/navbar.component';
import { FooterComponent } from '../../../layout/footer/footer.component';
import { CandidatePolicyModalComponent } from '../shared/policy-modal/policy-modal.component';
import { AuthService } from '../../../core/services/auth.service';
import { GlobalUiService } from '../../../core/services/global-ui.service';
import { MyBookingsService } from '../../../core/services/bookings.service';
import { BookingResponseDto, BookingStatus } from '../../../core/models/booking.model';

/** Lifecycle derived client-side from the REAL single `status` field returned by the backend
 *  (BookingResponseDto.status) — replaces the old mock's two-field Upcoming/Active/Completed/
 *  Cancelled vocabulary entirely. Rules mirror Features/Bookings/Services/BookingService.cs:
 *   - Modify: only 'Confirmed' bookings, and only when >= 24h before check-in (BP-11.1).
 *   - Cancel: blocked for Cancelled/Completed/CheckedIn/CheckedOut/'Pending Additional Payment'
 *     (a modification payment already in flight) — allowed for 'Pending Payment' and 'Confirmed'.
 *   - Invoice download: only for Confirmed/Completed (backend rejects anything else with 400). */
interface BookingRow {
  booking: BookingResponseDto;
  displayStatus: string;
  badgeClass: string;
  canModify: boolean;
  modifyLocked: boolean;
  canCancel: boolean;
  canDownloadInvoice: boolean;
  canPay: boolean;
  formattedTotal: string;
}

const NON_CANCELLABLE: BookingStatus[] = ['Cancelled', 'Completed', 'CheckedIn', 'CheckedOut', 'Pending Additional Payment'];
const INVOICE_ELIGIBLE: BookingStatus[] = ['Confirmed', 'Completed'];
// A booking sitting in either of these statuses still owes money and has no other action
// available to move it forward — "Complete Payment" resumes the same payment-portal flow the
// booking/modify wizards hand off to, instead of leaving the customer with no way to pay.
const PAYABLE: BookingStatus[] = ['Pending Payment', 'Pending Additional Payment'];

function badgeClassFor(status: BookingStatus): string {
  switch (status) {
    case 'Confirmed': return 'badge bg-success text-white px-3 py-2 rounded-pill';
    case 'CheckedIn': return 'badge bg-primary text-white px-3 py-2 rounded-pill';
    case 'CheckedOut': return 'badge bg-secondary text-white px-3 py-2 rounded-pill';
    case 'Completed': return 'badge bg-dark text-white px-3 py-2 rounded-pill';
    case 'Cancelled': return 'badge bg-danger text-white px-3 py-2 rounded-pill';
    case 'Pending Payment':
    case 'Pending Additional Payment':
    default: return 'badge bg-warning text-dark px-3 py-2 rounded-pill';
  }
}

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent, CandidatePolicyModalComponent],
  templateUrl: './my-bookings.component.html',
  styleUrl: './my-bookings.component.scss'
})
export class MyBookingsComponent implements OnInit {
  @ViewChild(CandidatePolicyModalComponent) policyModal!: CandidatePolicyModalComponent;

  isLoading = true;
  loadError = '';

  private allBookings: BookingResponseDto[] = [];
  private filteredBookings: BookingResponseDto[] = [];

  currentPage = 1;
  rowsPerPage = 10;

  searchQuery = '';
  statusFilterValue = 'all';

  paginatedRows: BookingRow[] = [];
  totalPages = 1;
  totalFiltered = 0;
  startIndex = 0;
  endIndex = 0;

  // Cancel flow modal state
  cancelPanel: 'reason' | 'confirm' | 'loading' | 'success' | 'error' = 'reason';
  cancelReasonSelect = '';
  cancelReasonErrVisible = false;
  currentCancelBooking: BookingResponseDto | null = null;
  cancelErrorMsg = '';
  cancelResult: {
    ref: string; original: number; amount: number; status: string; statusClass: string; message: string;
  } | null = null;

  // Booking details modal state
  detailsBooking: BookingResponseDto | null = null;

  constructor(
    private auth: AuthService,
    private bookingsService: MyBookingsService,
    private ui: GlobalUiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn || this.auth.userRole !== 'Customer') {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.loadBookings();
  }

  private loadBookings(): void {
    this.isLoading = true;
    this.loadError = '';
    this.bookingsService.getMyBookings().subscribe({
      next: (res) => {
        this.allBookings = res.data || [];
        this.isLoading = false;
        this.applyFilters();
      },
      error: () => {
        this.isLoading = false;
        this.loadError = 'Could not load your bookings right now. Please try again later.';
      }
    });
  }

  private hoursUntilCheckIn(b: BookingResponseDto): number {
    return (new Date(b.checkInDate).getTime() - Date.now()) / (1000 * 60 * 60);
  }

  private toRow(b: BookingResponseDto): BookingRow {
    const canModify = b.status === 'Confirmed' && this.hoursUntilCheckIn(b) >= 24;
    const modifyLocked = b.status === 'Confirmed' && this.hoursUntilCheckIn(b) < 24;
    const canCancel = !NON_CANCELLABLE.includes(b.status);
    const canDownloadInvoice = INVOICE_ELIGIBLE.includes(b.status);
    const canPay = PAYABLE.includes(b.status);
    return {
      booking: b,
      displayStatus: b.status,
      badgeClass: badgeClassFor(b.status),
      canModify,
      modifyLocked,
      canCancel,
      canDownloadInvoice,
      canPay,
      formattedTotal: b.totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })
    };
  }

  private renderTable(): void {
    const filtered = this.filteredBookings;

    this.totalFiltered = filtered.length;
    this.totalPages = Math.ceil(filtered.length / this.rowsPerPage) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;

    this.startIndex = (this.currentPage - 1) * this.rowsPerPage;
    this.endIndex = Math.min(this.startIndex + this.rowsPerPage, filtered.length);
    const paginated = filtered.slice(this.startIndex, this.endIndex);

    this.paginatedRows = paginated.map(b => this.toRow(b));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.renderTable();
  }

  prevPage(): void { this.goToPage(this.currentPage - 1); }
  nextPage(): void { this.goToPage(this.currentPage + 1); }

  onRowsPerPageChange(): void {
    this.currentPage = 1;
    this.renderTable();
  }

  applyFilters(): void {
    let bkgs = this.allBookings;
    if (this.statusFilterValue !== 'all') {
      bkgs = bkgs.filter(b => b.status === this.statusFilterValue);
    }
    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      bkgs = bkgs.filter(b =>
        b.bookingCustomId.toLowerCase().includes(q) ||
        (b.hotelName && b.hotelName.toLowerCase().includes(q)) ||
        (b.roomTypeName && b.roomTypeName.toLowerCase().includes(q))
      );
    }
    this.filteredBookings = bkgs;
    this.currentPage = 1;
    this.renderTable();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.statusFilterValue = 'all';
    this.applyFilters();
  }

  // ── Modify flow ──────────────────────────────────────────────
  onModifyClick(bookingId: number): void {
    if (this.policyModal) {
      this.policyModal.show({
        title: 'Review Booking Modification Policy',
        policyType: 'modification',
        onContinue: () => this.router.navigate(['/bookings/modify', bookingId, 'step1'])
      });
    } else {
      this.router.navigate(['/bookings/modify', bookingId, 'step1']);
    }
  }

  // ── Resume/complete payment flow ────────────────────────────
  // For a "Pending Payment" or "Pending Additional Payment" booking, hand off to payment-portal
  // exactly like the booking/modify wizards do — but without a stale isModification/price-diff
  // flag from some earlier, possibly abandoned session.
  onCompletePayment(booking: BookingResponseDto): void {
    sessionStorage.setItem('hbs_created_booking', JSON.stringify(booking));
    sessionStorage.removeItem('isModification');
    sessionStorage.removeItem('hbs_modify_price_diff');
    this.router.navigate(['/bookings/payment-portal']);
  }

  // ── Cancel flow ──────────────────────────────────────────────
  cancelModalEl(): HTMLElement | null {
    return document.getElementById('cancelConfirmModal');
  }

  onCancelClick(booking: BookingResponseDto): void {
    this.currentCancelBooking = booking;
    this.cancelPanel = 'reason';
    this.cancelReasonSelect = '';
    this.cancelReasonErrVisible = false;
    this.cancelErrorMsg = '';

    const modalEl = this.cancelModalEl();
    const bootstrap = (window as any).bootstrap;
    if (modalEl && bootstrap) {
      new bootstrap.Modal(modalEl).show();
    }
  }

  proceedToCancel(): void {
    if (!this.cancelReasonSelect) {
      this.cancelReasonErrVisible = true;
      return;
    }
    this.cancelReasonErrVisible = false;
    this.cancelPanel = 'confirm';
  }

  backToReason(): void {
    this.cancelPanel = 'reason';
  }

  confirmCancellation(): void {
    if (!this.currentCancelBooking) return;
    const booking = this.currentCancelBooking;

    this.cancelPanel = 'loading';

    this.bookingsService.cancelBooking(booking.id).subscribe({
      next: (res) => {
        const cancelled = res.data;
        const isRefunded = cancelled.walletAmountUsed !== booking.walletAmountUsed || cancelled.status === 'Cancelled';
        this.cancelResult = {
          ref: booking.bookingCustomId,
          original: booking.totalAmount,
          amount: 0,
          status: cancelled.status,
          statusClass: 'badge bg-danger text-white',
          message: res.message || 'Your booking has been cancelled successfully. Any eligible refund will be credited per our cancellation policy.'
        };

        // Refresh the list from the server so status/rowVersion stay authoritative.
        this.loadBookings();
        this.cancelPanel = 'success';
      },
      error: (err) => {
        this.cancelErrorMsg = err?.error?.message || 'This booking could not be cancelled. Please try again.';
        this.cancelPanel = 'error';
      }
    });
  }

  // ── View details flow ────────────────────────────────────────
  onViewDetails(booking: BookingResponseDto): void {
    this.detailsBooking = booking;

    const modalEl = document.getElementById('bookingDetailsModal');
    const bootstrap = (window as any).bootstrap;
    if (modalEl && bootstrap) new bootstrap.Modal(modalEl).show();
  }

  detailsRow(): BookingRow | null {
    return this.detailsBooking ? this.toRow(this.detailsBooking) : null;
  }

  downloadTicket(): void {
    if (!this.detailsBooking) return;
    const id = this.detailsBooking.id;
    this.bookingsService.downloadInvoice(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${this.detailsBooking!.bookingCustomId}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.ui.showToast('Invoice is only available for confirmed or completed bookings.');
      }
    });
  }
}
