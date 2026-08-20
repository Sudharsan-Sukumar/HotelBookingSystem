import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../layout/navbar/navbar.component';
import { FooterComponent } from '../../../layout/footer/footer.component';
import { PolicyModalComponent } from '../shared/policy-modal/policy-modal.component';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { BookingRequestDto, BookingResponseDto } from '../../../core/models/booking.model';
import { PaymentMethod } from '../../../core/models/payment.model';
import { BookingSelection, GuestDetailsPayload, BookingWorkflowStore } from '../store/booking-workflow.store';

/**
 * Real-backend version. Reads hbs_booking_selection + hbs_booking_guest written by
 * room-selection / guest-details. On "Proceed to Payment" shows the shared policy modal;
 * once the user accepts it, this component itself creates the booking
 * (POST /api/bookings — status starts "Pending Payment") and stores the returned
 * BookingResponseDto under `hbs_created_booking` for payment-portal to read and take to
 * Razorpay. Booking creation happens here (not in payment-portal) because the backend needs
 * the booking to exist before a payment link can reference it.
 */
@Component({
  selector: 'app-invoice-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent, FooterComponent, PolicyModalComponent],
  templateUrl: './invoice-summary.component.html',
  styleUrl: './invoice-summary.component.scss'
})
export class InvoiceSummaryComponent implements OnInit {
  @ViewChild(PolicyModalComponent) policyModal!: PolicyModalComponent;

  private readonly base = environment.apiUrl;

  loaded = false;

  bookingId = '';
  hotel: any = null;
  branchName = '';
  roomType = '';

  checkin = '';
  checkout = '';
  nights = 1;
  rooms = 1;
  pricePerNight = 0;
  baseAmount = 0;
  gst = 0;
  total = 0;

  adults = 1;
  children = 0;

  guestDetails: GuestDetailsPayload | null = null;
  primaryGuest: any = {};
  specialRequestsText = 'None';
  roomCapacityText = '';

  selectedPaymentMethod: PaymentMethod | '' = '';
  paymentMethodError = false;
  useWalletBalance = false;

  creatingBooking = false;
  createBookingError = '';

  private selection: BookingSelection | null = null;
  private readonly bookingStore = inject(BookingWorkflowStore);

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit(): void {
    this.selection = this.bookingStore.selection();
    this.guestDetails = this.bookingStore.guestDetails();

    if (!this.selection || !this.guestDetails) {
      this.router.navigate(['/bookings/guest-details']);
      return;
    }

    this.checkin = this.selection.checkIn;
    this.checkout = this.selection.checkOut;
    this.nights = this.selection.nights || 1;
    this.pricePerNight = this.selection.pricePerNight || 0;
    this.baseAmount = this.selection.totalAmount || 0;
    this.gst = this.selection.taxAmount || 0;
    this.total = this.selection.grandTotal || 0;
    this.adults = this.selection.adults || 1;
    this.children = this.selection.children || 0;

    this.roomType = `${this.selection.roomTypeName || 'Selected'} Room`;

    this.http.get<ApiResponse<any>>(`${this.base}/hotels/${this.selection.hotelId}`).subscribe({
      next: (res) => {
        this.hotel = res.data;
        this.branchName = this.hotel.city || '';
        this.loaded = true;
      },
      error: () => {
        // Hotel lookup failing shouldn't block viewing the summary — just leaves branch/name blank.
        this.loaded = true;
      }
    });

    this.primaryGuest = this.guestDetails?.primaryGuest || {};
    this.specialRequestsText = this.guestDetails?.specialRequests || 'None';

    const cap = this.selection.maxOccupancy;
    this.roomCapacityText = typeof cap === 'number' ? `${cap} Guests` : `${this.adults + this.children} Guests`;
  }

  get guestTotalCount(): number {
    return (Number(this.adults) || 0) + (Number(this.children) || 0);
  }

  get checkinFormatted(): string {
    return this.checkin ? new Date(this.checkin).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  }

  get checkoutFormatted(): string {
    return this.checkout ? new Date(this.checkout).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  }

  get checkinDayName(): string {
    return this.checkin ? new Date(this.checkin).toLocaleDateString('en-US', { weekday: 'long' }) : '';
  }

  get checkoutDayName(): string {
    return this.checkout ? new Date(this.checkout).toLocaleDateString('en-US', { weekday: 'long' }) : '';
  }

  get baseRoomChargeLabel(): string {
    return `Base room charge (${this.nights} × Rs. ${this.pricePerNight.toLocaleString()})`;
  }

  selectPaymentMethod(method: PaymentMethod): void {
    this.selectedPaymentMethod = method;
    this.paymentMethodError = false;
  }

  onProceedToPayment(): void {
    if (!this.selectedPaymentMethod) {
      this.paymentMethodError = true;
      return;
    }
    this.createBookingError = '';
    this.policyModal.open('payment', 'Booking & Cancellation Policies');
  }

  /** Runs after the user accepts the policy in the shared modal — this is when we actually call the API. */
  onPolicyContinue(): void {
    this.creatingBooking = true;
    this.createBookingError = '';

    const dto: BookingRequestDto = {
      hotelId: Number(this.selection!.hotelId),
      roomTypeId: Number(this.selection!.roomTypeId),
      idProofType: this.primaryGuest.idType,
      idProofNumber: this.primaryGuest.idNumber,
      checkInDate: this.checkin,
      checkOutDate: this.checkout,
      numberOfRooms: this.rooms,
      specialRequests: this.specialRequestsText !== 'None' ? this.specialRequestsText : undefined
    };

    this.http.post<ApiResponse<BookingResponseDto>>(`${this.base}/bookings`, dto).subscribe({
      next: (res) => {
        this.creatingBooking = false;
        this.bookingStore.setCreatedBooking(res.data, this.selectedPaymentMethod, this.useWalletBalance);
        this.router.navigate(['/bookings/payment-portal']);
      },
      error: (err: HttpErrorResponse) => {
        this.creatingBooking = false;
        this.createBookingError = (err as any).friendlyMessage
          || (err.status === 409 ? 'The selected room is no longer available. Please search again.' : 'Could not create the booking. Please try again.');
      }
    });
  }
}
