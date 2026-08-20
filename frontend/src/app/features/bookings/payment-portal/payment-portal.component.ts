import { AfterViewInit, Component, ComponentRef, OnDestroy, OnInit, Type, ViewChild, ViewContainerRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { TimeoutError } from 'rxjs';
import { NavbarComponent } from '../../../layout/navbar/navbar.component';
import { AuthService } from '../../../core/services/auth.service';
import { RenderTickService } from '../../../core/services/render-tick.service';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { BookingResponseDto } from '../../../core/models/booking.model';
import { CreatePaymentLinkDto, PAYMENT_METHODS, PaymentLinkResponseDto, PaymentMethod, RazorpayPaymentStatusDto } from '../../../core/models/payment.model';
import { BookingSelection, BookingWorkflowStore } from '../store/booking-workflow.store';
import { UpiPaymentPanelComponent } from './method-panels/upi-payment-panel.component';
import { CardPaymentPanelComponent } from './method-panels/card-payment-panel.component';
import { NetBankingPaymentPanelComponent } from './method-panels/netbanking-payment-panel.component';

/** Real Angular dynamic-component-loading (ViewContainerRef.createComponent), not `*ngSwitch` on a
 *  string: each payment method resolves to a distinct standalone component, instantiated on demand
 *  into an anchor in the template (#methodPanelHost) and destroyed/replaced when the method changes.
 *  "Credit Card" and "Debit Card" intentionally share CardPaymentPanelComponent (same UI, different
 *  label input) rather than needing a 4th near-duplicate component. */
type PaymentPanelComponent = UpiPaymentPanelComponent | CardPaymentPanelComponent | NetBankingPaymentPanelComponent;
const PAYMENT_METHOD_PANELS: Record<PaymentMethod, Type<PaymentPanelComponent>> = {
  'UPI': UpiPaymentPanelComponent,
  'Credit Card': CardPaymentPanelComponent,
  'Debit Card': CardPaymentPanelComponent,
  'Net Banking': NetBankingPaymentPanelComponent
};

type PaymentState = 'idle' | 'waiting' | 'failed' | 'timeout' | 'gatewayUnavailable' | 'sessionExpired' | 'partiallyPaid';

const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 45; // ~3 minutes

// If Razorpay's payment-link creation call hasn't responded within this window, stop waiting and
// fall back to the "choose a different payment method" path instead of spinning indefinitely —
// mirrors the backend's own RazorpayUnavailableException fallback for a real outage.
const PAYMENT_LINK_TIMEOUT_MS = 10000;

/**
 * Real-backend version — no Razorpay JS SDK anywhere. Reads the BookingResponseDto created by
 * invoice-summary (`hbs_created_booking`), lets the user pick one of the 4 exact backend-accepted
 * payment methods, calls POST /api/razorpay/payment-link, then either:
 *  - paymentUrl is empty -> wallet fully covered the amount, booking already confirmed -> success page
 *  - paymentUrl is set -> window.open() the REAL hosted Razorpay page, then poll
 *    GET /api/razorpay/status/{reference} every 4s (up to ~3 minutes) for a terminal status.
 *
 * Also supports the "modify booking, pay the difference" path (isModification=true in
 * sessionStorage, set by modify-step3) using the same payment-link + polling machinery against
 * the existing booking id instead of a freshly-created one.
 */
@Component({
  selector: 'app-payment-portal',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  templateUrl: './payment-portal.component.html',
  styleUrl: './payment-portal.component.scss'
})
export class PaymentPortalComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly base = environment.apiUrl;

  @ViewChild('methodPanelHost', { read: ViewContainerRef }) methodPanelHost!: ViewContainerRef;
  private methodPanelRef: ComponentRef<PaymentPanelComponent> | null = null;

  isModification = false;
  booking: BookingResponseDto | null = null;
  selection: BookingSelection | null = null;

  paymentMethods = PAYMENT_METHODS;
  selectedMethod: PaymentMethod | '' = '';
  methodError = false;
  useWalletBalance = false;

  summaryHotelImg = '/assets/images/hotel_cbe.png';
  summaryHotelName = '';
  summaryHotelBranchRoom = '';
  summaryCheckIn = '';
  summaryCheckOut = '';
  summaryDuration = '';
  summaryGuests = '';
  summaryBookingId = '';
  summaryBaseCharge = '';
  summaryTaxes = '';
  summaryTotalAmount = '';

  amountToPay = 0;
  lblRazorpayAmount = '';
  lblPaymentLabel = 'Total Amount Due';
  lblPaymentNote = '';
  displayName = 'Guest';
  displayEmail = '';

  payButtonDisabled = false;
  payButtonText = 'Pay Now';
  showProgressOverlay = false;
  failReason = 'Payment not completed within the allotted time.';
  linkError = '';

  paymentState: PaymentState = 'idle';
  paymentUrl = '';

  // Split-Payment Fallback: set once a chunk of a multi-part payment is confirmed Paid but the
  // booking's outstanding balance isn't fully settled yet (Razorpay account's single-link cap is
  // below what's owed). partsPaidSoFar/estimatedTotalParts are purely cosmetic ("Part 2 of 3"); the
  // only value that actually drives the next payment is remainingAfterCurrentPayment.
  remainingAfterCurrentPayment = 0;
  partsPaidSoFar = 0;

  private reference = '';
  private pollAttempts = 0;
  private pollTimer: any = null;
  private readonly bookingStore = inject(BookingWorkflowStore);

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private renderTick: RenderTickService
  ) {}

  ngOnInit(): void {
    this.isModification = this.bookingStore.isModification();

    const createdBooking = this.bookingStore.createdBooking();
    if (!createdBooking) {
      this.router.navigate(['/hotels/search']);
      return;
    }
    this.booking = createdBooking;

    this.selection = this.bookingStore.selection();

    const storedMethod = this.bookingStore.selectedPaymentMethod();
    if (storedMethod && (PAYMENT_METHODS as readonly string[]).includes(storedMethod)) {
      this.selectedMethod = storedMethod;
    }
    this.useWalletBalance = this.bookingStore.useWalletBalance();

    this.displayName = this.auth.userName || 'Guest';
    this.displayEmail = this.auth.userEmail || '';

    this.summaryHotelName = this.booking!.hotelName;
    this.summaryHotelBranchRoom = `${this.booking!.roomTypeName} Room`;
    this.summaryCheckIn = new Date(this.booking!.checkInDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    this.summaryCheckOut = new Date(this.booking!.checkOutDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const nights = Math.round((new Date(this.booking!.checkOutDate).getTime() - new Date(this.booking!.checkInDate).getTime()) / 86400000);
    this.summaryDuration = `${nights} Night${nights > 1 ? 's' : ''}`;
    this.summaryGuests = this.selection ? `${(this.selection.adults || 1) + (this.selection.children || 0)} Guests` : '';
    this.summaryBookingId = this.booking!.bookingCustomId || `#${this.booking!.id}`;

    this.summaryBaseCharge = this.formatInr(this.booking!.baseCost);
    this.summaryTaxes = this.formatInr(this.booking!.taxAmount);
    this.summaryTotalAmount = this.formatInr(this.booking!.totalAmount);

    // amountToPay: for a same-session modification hand-off, sessionStorage carries the exact
    // priceDiff written by modify-step3. Otherwise (a fresh booking, or a "Pending Payment"/
    // "Pending Additional Payment" booking resumed later from My Bookings with no priceDiff in
    // session) fall back to totalAmount minus whatever wallet amount is already applied — this is
    // exactly the "outstanding" figure CreatePaymentLinkAsync itself computes server-side, so it
    // matches whether the booking was just created or is being resumed after a modification.
    const priceDiff = this.bookingStore.modifyPriceDiff();
    const outstanding = this.booking!.totalAmount - (this.booking!.walletAmountUsed || 0);
    this.amountToPay = this.isModification && priceDiff != null ? Math.max(priceDiff, 0) : outstanding;

    this.lblRazorpayAmount = this.formatInr(this.amountToPay);
    this.lblPaymentLabel = this.isModification ? 'Additional Amount Due' : 'Total Amount Due';
    this.lblPaymentNote = this.isModification
      ? 'Booking modification · Additional charge inclusive of GST'
      : `New booking · ${nights} Night(s) · Inclusive of GST`;
  }

  ngAfterViewInit(): void {
    // The anchor only exists once the view is initialized — if a method was already selected
    // (rehydrated from the booking-workflow store, e.g. after a page reload), load its panel now.
    if (this.selectedMethod) this.loadMethodPanel(this.selectedMethod);
  }

  ngOnDestroy(): void {
    this.clearPollTimer();
    this.methodPanelRef?.destroy();
  }

  private formatInr(value: number): string {
    return (value ?? 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  }

  /** Instantiates the payment-method-specific component into #methodPanelHost via
   *  ViewContainerRef.createComponent — real dynamic component loading, not `*ngSwitch`. Clears
   *  whatever panel was previously loaded first, since only one method is ever selected at a time. */
  private loadMethodPanel(method: PaymentMethod): void {
    this.methodPanelHost.clear();
    const panelType = PAYMENT_METHOD_PANELS[method];
    this.methodPanelRef = this.methodPanelHost.createComponent(panelType);
    this.methodPanelRef.setInput('amount', this.lblRazorpayAmount);
    if (method === 'Credit Card' || method === 'Debit Card') {
      (this.methodPanelRef as ComponentRef<CardPaymentPanelComponent>).setInput('cardLabel', method);
    }
  }

  selectMethod(method: PaymentMethod): void {
    this.selectedMethod = method;
    this.methodError = false;
    this.loadMethodPanel(method);
  }

  payNow(): void {
    if (!this.selectedMethod) {
      this.methodError = true;
      return;
    }
    if (!this.booking) return;

    this.payButtonDisabled = true;
    this.showProgressOverlay = true;
    this.linkError = '';

    const dto: CreatePaymentLinkDto = {
      bookingId: this.booking.id,
      paymentMethod: this.selectedMethod,
      amountToPay: this.amountToPay,
      useWalletBalance: this.useWalletBalance
    };

    this.http.post<ApiResponse<PaymentLinkResponseDto>>(`${this.base}/razorpay/payment-link`, dto)
      .pipe(timeout(PAYMENT_LINK_TIMEOUT_MS))
      .subscribe({
        next: (res) => {
          this.showProgressOverlay = false;
          this.payButtonDisabled = false;
          const link = res.data;

          if (!link.paymentUrl) {
            // Wallet alone covered the full amount — booking is already confirmed server-side.
            this.finishSuccessfully();
            this.renderTick.requestTick();
            return;
          }

          this.paymentUrl = link.paymentUrl;
          this.reference = link.reference;
          this.remainingAfterCurrentPayment = link.remainingAfterThisPayment || 0;
          window.open(link.paymentUrl, '_blank', 'noopener');

          this.paymentState = 'waiting';
          this.pollAttempts = 0;
          this.startPolling();
          // The extra timeout() operator wrapping this call means the error interceptor's own
          // finalize()-driven RenderTickService.requestTick() fires at the wrong point relative to
          // these state mutations (same root cause documented in RenderTickService's own doc
          // comment and already worked around explicitly in booking-monitoring.component.ts) — so
          // every branch here must request its own tick rather than rely on the interceptor's.
          this.renderTick.requestTick();
        },
        error: (err: HttpErrorResponse | TimeoutError) => {
          this.showProgressOverlay = false;
          this.payButtonDisabled = false;

          if (err instanceof TimeoutError) {
            // Razorpay didn't respond within PAYMENT_LINK_TIMEOUT_MS — stop waiting and fall back
            // to the "choose a different payment method" path instead of leaving the customer
            // staring at a spinner.
            this.paymentState = 'gatewayUnavailable';
            this.renderTick.requestTick();
            return;
          }

          const serverMessage: string = (err as any)?.error?.message || '';
          if (serverMessage.toLowerCase().includes('payment session expired')) {
            // The original "go back to the booking summary and try again" advice is stale once
            // this booking is being resumed from My Bookings — there's no summary page to return
            // to, and a "Pending Additional Payment" booking can't even be cancelled from here.
            this.paymentState = 'sessionExpired';
            this.renderTick.requestTick();
            return;
          }

          this.linkError = (err as any).friendlyMessage || 'Could not start payment. Please try again.';
          this.renderTick.requestTick();
        }
      });
  }

  private startPolling(): void {
    this.clearPollTimer();
    this.pollTimer = setInterval(() => this.pollOnce(), POLL_INTERVAL_MS);
  }

  private clearPollTimer(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private pollOnce(): void {
    this.pollAttempts++;
    this.http.get<ApiResponse<RazorpayPaymentStatusDto>>(`${this.base}/razorpay/status/${this.reference}`).subscribe({
      next: (res) => this.handleStatus(res.data),
      error: () => {
        // Transient lookup failure — keep polling until max attempts, don't fail the whole flow on one blip.
        if (this.pollAttempts >= MAX_POLL_ATTEMPTS) this.handleTimeout();
      }
    });

    if (this.pollAttempts >= MAX_POLL_ATTEMPTS && this.paymentState === 'waiting') {
      this.handleTimeout();
    }
  }

  /** Checks status once on demand (the "Check Again" button after a timeout). */
  checkStatusOnce(): void {
    this.http.get<ApiResponse<RazorpayPaymentStatusDto>>(`${this.base}/razorpay/status/${this.reference}`).subscribe({
      next: (res) => this.handleStatus(res.data),
      error: () => { /* stay on timeout state */ }
    });
  }

  private handleStatus(statusDto: RazorpayPaymentStatusDto): void {
    const normalized = (statusDto.status || '').toLowerCase();
    if (normalized === 'paid' || normalized === 'completed' || normalized === 'confirmed') {
      this.clearPollTimer();

      // Split-Payment Fallback: this chunk is Paid, but the booking's outstanding balance isn't
      // fully settled — Razorpay's single-link cap meant it had to be collected in parts. Instead
      // of the usual "booking confirmed" success page, prompt the customer to pay the remainder.
      if (statusDto.isPartialPayment) {
        this.partsPaidSoFar++;
        this.remainingAfterCurrentPayment = statusDto.remainingAfterThisPayment;
        this.amountToPay = statusDto.remainingAfterThisPayment;
        this.lblRazorpayAmount = this.formatInr(this.amountToPay);
        this.methodPanelRef?.setInput('amount', this.lblRazorpayAmount);
        this.useWalletBalance = false; // wallet is only ever offered on the first chunk
        this.paymentState = 'partiallyPaid';
      } else {
        this.finishSuccessfully();
      }
    } else if (normalized === 'failed' || normalized === 'cancelled' || normalized === 'expired') {
      this.clearPollTimer();
      this.failReason = 'Your payment was not completed. Please try again.';
      this.paymentState = 'failed';
    }
    // Otherwise still pending/created — keep polling.
    this.renderTick.requestTick();
  }

  private handleTimeout(): void {
    this.clearPollTimer();
    this.paymentState = 'timeout';
    this.renderTick.requestTick();
  }

  private finishSuccessfully(): void {
    this.paymentState = 'idle';
    this.bookingStore.setLastBookingId(this.booking!.id);
    this.router.navigate(['/bookings/success']);
  }

  resetToIdle(): void {
    this.paymentState = 'idle';
    this.linkError = '';
  }

  /** Same as resetToIdle(), but also clears whichever method was selected — used by the
   *  gateway-unavailable fallback so the customer lands back on method selection with nothing
   *  pre-picked, instead of one click away from silently retrying the exact same method again. */
  retryWithDifferentMethod(): void {
    this.selectedMethod = '';
    this.methodError = false;
    this.resetToIdle();
  }

  /** Split-Payment Fallback: kicks off the next chunk. amountToPay/lblRazorpayAmount were already
   *  updated to the remainder in handleStatus() when the previous chunk confirmed as Paid, so this
   *  is otherwise the exact same call payNow() always makes. */
  payRemainingAmount(): void {
    this.paymentState = 'idle';
    this.payNow();
  }
}
