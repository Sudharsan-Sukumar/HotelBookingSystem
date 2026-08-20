import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../layout/navbar/navbar.component';
import { PolicyModalComponent } from '../shared/policy-modal/policy-modal.component';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { BookingResponseDto, ModifyBookingDto } from '../../../core/models/booking.model';
import { MODIFY_SELECTION_KEY } from '../modify-step1/modify-step1.component';
import { BookingWorkflowStore } from '../store/booking-workflow.store';

/**
 * Step 3 of the Modify Booking wizard — real-backend version. Calls
 * PUT /api/bookings/{id}/modify with {checkInDate, checkOutDate, rowVersion}, sending back the
 * rowVersion from the freshly-loaded booking so a stale multi-tab edit is rejected with a 409
 * ("changed elsewhere, please reload") rather than silently overwritten.
 *
 * If the modification results in additional money owed, ModifyBookingDto has no payment field —
 * the backend itself flips the booking to "Pending Additional Payment" and the modify call still
 * succeeds; this component then routes to payment-portal (isModification=true) for the actual
 * charge, exactly mirroring how a fresh booking hands off to payment after POST /api/bookings.
 */
@Component({
  selector: 'app-modify-step3',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, PolicyModalComponent],
  templateUrl: './modify-step3.component.html',
  styleUrl: './modify-step3.component.scss'
})
export class ModifyStep3Component implements OnInit {
  @ViewChild('policyModal') policyModal!: PolicyModalComponent;

  private readonly base = environment.apiUrl;

  bookingId = '';
  booking: BookingResponseDto | null = null;
  sessionError = '';

  newCheckIn = '';
  newCheckOut = '';
  newNights = 1;
  newGrandTotal = 0;
  priceDiff = 0;

  oldGrandTotal = 0;

  submitting = false;
  submitError = '';
  conflict = false;

  private readonly bookingStore = inject(BookingWorkflowStore);

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.bookingId = this.route.snapshot.paramMap.get('bookingId') || '';
    const selectionStr = sessionStorage.getItem(MODIFY_SELECTION_KEY);

    if (!this.bookingId || !selectionStr) {
      this.sessionError = 'No modification session active.';
      return;
    }

    const selection = JSON.parse(selectionStr);
    if (selection.bookingId !== this.bookingId) {
      this.sessionError = 'No modification session active.';
      return;
    }

    this.http.get<ApiResponse<BookingResponseDto>>(`${this.base}/bookings/${this.bookingId}`).subscribe({
      next: (res) => {
        this.booking = res.data;
        this.oldGrandTotal = res.data.totalAmount;

        const calc = selection.draftChanges?.calculated || {};
        this.newCheckIn = calc.newCheckIn || this.booking.checkInDate;
        this.newCheckOut = calc.newCheckOut || this.booking.checkOutDate;
        this.newNights = Number(calc.newNights) || 1;
        this.newGrandTotal = Number(calc.newGrandTotal) || this.oldGrandTotal;
        this.priceDiff = Number(calc.priceDiff) || 0;
      },
      error: () => { this.sessionError = 'Booking record not found.'; }
    });
  }

  get absPriceDiff(): number { return Math.abs(this.priceDiff); }

  get diffTitle(): string {
    if (this.priceDiff > 0) return 'Additional Amount Required';
    if (this.priceDiff < 0) return 'Refund Amount Due';
    return 'Stay Modified Successfully';
  }

  get diffDesc(): string {
    if (this.priceDiff > 0) return 'To confirm this modification, you will be taken to payment to pay the difference.';
    if (this.priceDiff < 0) return 'Any refund due will be credited to your wallet automatically by the backend.';
    return 'No extra charges or refunds required.';
  }

  get proceedLabel(): string {
    if (this.priceDiff > 0) return 'Proceed to Payment';
    if (this.priceDiff < 0) return 'Confirm Stay Modification & Refund';
    return 'Confirm Stay Modification';
  }

  onProceedClick(): void {
    this.submitError = '';
    this.policyModal.open('modification', 'Booking Modification Policy');
  }

  onPolicyBack(): void {
    // Original policy_modal.js just closes the modal on Back; no navigation.
  }

  /** Runs after the user accepts the modification policy in the modal — this is when we call the API. */
  onPolicyContinue(): void {
    if (!this.booking) return;
    this.submitting = true;
    this.submitError = '';
    this.conflict = false;

    const dto: ModifyBookingDto = {
      checkInDate: this.newCheckIn,
      checkOutDate: this.newCheckOut,
      rowVersion: this.booking.rowVersion
    };

    this.http.put<ApiResponse<BookingResponseDto>>(`${this.base}/bookings/${this.bookingId}/modify`, dto).subscribe({
      next: (res) => {
        this.submitting = false;
        sessionStorage.removeItem(MODIFY_SELECTION_KEY);

        const updated = res.data;

        if (updated.status === 'Pending Additional Payment' && this.priceDiff > 0) {
          // Hand off to payment-portal exactly like a fresh booking does.
          this.bookingStore.startModification(updated, this.priceDiff);
          this.router.navigate(['/bookings/payment-portal']);
        } else {
          this.bookingStore.setLastBookingId(updated.id);
          this.router.navigate(['/bookings/success']);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.submitting = false;
        if (err.status === 409) {
          this.conflict = true;
          this.submitError = 'This booking was changed elsewhere since you loaded it. Please reload and try again.';
        } else {
          this.submitError = (err as any).friendlyMessage || 'Could not modify the booking. Please try again.';
        }
      }
    });
  }

  reload(): void {
    window.location.reload();
  }
}
