import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../layout/navbar/navbar.component';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { BookingResponseDto } from '../../../core/models/booking.model';
import { MODIFY_SELECTION_KEY } from '../modify-step1/modify-step1.component';

/**
 * Step 2 of the Modify Booking wizard — real-backend version. Recomputes pricing using the
 * SAME per-night rate the backend already charged (booking.baseCost / current nights) and the
 * SAME tax ratio observed on the booking (taxAmount / baseCost) rather than hardcoding 18%
 * separately — this stays correct even if a per-booking policy snapshot differs. The final
 * authoritative total is always whatever the backend returns from the modify/payment calls; this
 * page's numbers are a preview only.
 */
@Component({
  selector: 'app-modify-step2',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  templateUrl: './modify-step2.component.html',
  styleUrl: './modify-step2.component.scss'
})
export class ModifyStep2Component implements OnInit {
  private readonly base = environment.apiUrl;

  bookingId = '';
  booking: BookingResponseDto | null = null;
  sessionError = '';

  newCheckIn = '';
  newCheckOut = '';
  newNights = 1;
  newGuests = 2;
  newRoomType = '';
  newPricePerNight = 0;

  oldGrandTotal = 0;
  newTotalAmount = 0;
  newTaxAmount = 0;
  newGrandTotal = 0;
  priceDiff = 0;

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
      next: (res) => this.applyBooking(res.data, selection),
      error: () => { this.sessionError = 'Booking record not found.'; }
    });
  }

  private applyBooking(booking: BookingResponseDto, selection: any): void {
    this.booking = booking;
    this.oldGrandTotal = booking.totalAmount;
    this.newRoomType = booking.roomTypeName;

    const currentNights = Math.max(1, Math.round(
      (new Date(booking.checkOutDate).getTime() - new Date(booking.checkInDate).getTime()) / 86400000
    ));
    this.newPricePerNight = booking.baseCost / currentNights;
    // Tax ratio actually applied to this booking (e.g. 0.18 for 18% GST) — derived, not assumed.
    const taxRatio = booking.baseCost > 0 ? booking.taxAmount / booking.baseCost : 0.18;

    const draft = selection.draftChanges;
    this.newCheckIn = draft?.checkIn || this.toIso(new Date(booking.checkInDate));
    this.newCheckOut = draft?.checkOut || this.toIso(new Date(booking.checkOutDate));
    this.newGuests = draft?.guests || 2;
    this.newNights = Math.max(1, Math.round(
      (new Date(this.newCheckOut).getTime() - new Date(this.newCheckIn).getTime()) / 86400000
    ));

    this.newTotalAmount = this.newPricePerNight * this.newNights;
    this.newTaxAmount = this.newTotalAmount * taxRatio;
    this.newGrandTotal = this.newTotalAmount + this.newTaxAmount;
    this.priceDiff = this.newGrandTotal - this.oldGrandTotal;

    selection.draftChanges = selection.draftChanges || {};
    selection.draftChanges.calculated = {
      newCheckIn: this.newCheckIn,
      newCheckOut: this.newCheckOut,
      newNights: this.newNights,
      newGrandTotal: this.newGrandTotal,
      newTotalAmount: this.newTotalAmount,
      newTaxAmount: this.newTaxAmount,
      priceDiff: this.priceDiff,
      newRoomType: this.newRoomType,
      newGuests: this.newGuests
    };
    sessionStorage.setItem(MODIFY_SELECTION_KEY, JSON.stringify(selection));
  }

  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  get absPriceDiff(): number { return Math.abs(this.priceDiff); }

  get avgPerNightWithTax(): number {
    return Math.round(this.newGrandTotal / this.newNights);
  }

  get diffLabel(): string {
    if (Math.abs(this.priceDiff) < 0.01) return 'No price difference';
    return this.priceDiff > 0
      ? `+₹${Math.round(this.priceDiff).toLocaleString('en-IN')} additional payment required`
      : `-₹${Math.round(Math.abs(this.priceDiff)).toLocaleString('en-IN')} refund eligible`;
  }

  continueToConfirmation(): void {
    this.router.navigate(['/bookings/modify', this.bookingId, 'step3']);
  }
}
