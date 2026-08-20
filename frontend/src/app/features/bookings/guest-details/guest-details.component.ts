import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../../layout/navbar/navbar.component';
import { FooterComponent } from '../../../layout/footer/footer.component';
import { AuthService } from '../../../core/services/auth.service';
import { ValidationService } from '../../../core/services/validation.service';
import { IdProofType } from '../../../core/models/booking.model';
import { BookingSelection, BookingWorkflowStore } from '../store/booking-workflow.store';

/**
 * Real-backend version. Reads the `hbs_booking_selection` contract written by room-selection
 * (roomTypeId-based), prefills guest identity from AuthService (JWT-derived, no HotelStateService
 * user lookup), validates stay dates / occupancy / ID document using the SAME rules the backend
 * enforces server-side (BookingRequestDto.Validate): check-in not in the past, check-out after
 * check-in, max 30 nights, max 365-day advance window — then writes hbs_booking_guest and
 * navigates to invoice-summary.
 *
 * ID proof type dropdown now uses the backend's exact allowed values: "Aadhar Card" | "Passport" |
 * "Driver's License" | "PAN" (ValidationRegexConstants / BookingRequestDto.AllowedIDProofTypes).
 */
@Component({
  selector: 'app-guest-details',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent, FooterComponent],
  templateUrl: './guest-details.component.html',
  styleUrl: './guest-details.component.scss'
})
export class GuestDetailsComponent implements OnInit {
  ready = false;

  maxOccupancy = 4;
  todayStr = new Date().toISOString().split('T')[0];

  guestName = '';
  guestEmail = '';
  guestIdType: IdProofType | '' = '';
  guestIdNumber = '';
  guestIdNumberError = '';

  guestCount = 1;
  guestPhone = '';
  guestPhoneError = '';
  checkinDate = '';
  checkoutDate = '';
  specialRequests = '';

  guestErrorMsg = '';
  checkinErrorMsg = '';
  checkoutErrorMsg = '';
  dateErrorMsg = '';

  formValid = false;

  private selection: BookingSelection | null = null;
  private readonly bookingStore = inject(BookingWorkflowStore);

  constructor(
    private auth: AuthService,
    private validation: ValidationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const currentSelection = this.bookingStore.selection();
    if (!currentSelection) {
      this.router.navigate(['/hotels/search']);
      return;
    }
    this.selection = currentSelection;

    if (!this.auth.isLoggedIn) {
      this.router.navigate(['/auth/login']);
      return;
    }

    const user = this.auth.currentUser;
    this.guestName = user ? `${user.firstName} ${user.lastName}`.trim() : '';
    this.guestEmail = this.auth.userEmail;

    const cap = this.selection.maxOccupancy;
    this.maxOccupancy = typeof cap === 'number' ? cap : 4;

    this.checkinDate = this.selection.checkIn || '';
    this.checkoutDate = this.selection.checkOut || '';
    this.guestCount = (Number(this.selection.adults) || 1) + (Number(this.selection.children) || 0);

    this.ready = true;
    this.validateForm();
  }

  get capacityBadgeText(): string {
    return `Max ${this.maxOccupancy} Guest${this.maxOccupancy > 1 ? 's' : ''}`;
  }

  get charCounterText(): string {
    return `${this.specialRequests.length} / 300`;
  }

  onCheckinChange(): void {
    if (this.checkoutDate) {
      const checkinObj = new Date(this.checkinDate);
      const checkoutObj = new Date(this.checkoutDate);
      if (checkoutObj <= checkinObj) {
        this.checkoutDate = '';
      }
    }
    this.validateForm();
  }

  onIdTypeChange(): void {
    this.guestIdNumber = '';
    this.guestIdNumberError = '';
    this.validateForm();
  }

  onIdNumberInput(): void {
    if (this.guestIdType === 'PAN' || this.guestIdType === 'Passport') {
      this.guestIdNumber = this.guestIdNumber.toUpperCase();
    }
    this.validateForm();
  }

  get idNumberPlaceholder(): string {
    if (this.guestIdType === 'Aadhar Card') return 'Enter 12-digit Aadhar Number';
    if (this.guestIdType === 'PAN') return 'Enter PAN Number';
    if (this.guestIdType === 'Passport') return 'Enter Passport Number';
    if (this.guestIdType === "Driver's License") return "Enter Driver's License Number";
    return 'Enter ID Number';
  }

  /** Mirrors BookingRequestDto.Validate() on the backend exactly. */
  private validateStayDates(): boolean {
    this.checkinErrorMsg = '';
    this.checkoutErrorMsg = '';
    this.dateErrorMsg = '';

    if (!this.checkinDate) {
      this.checkinErrorMsg = 'Check-in date is mandatory.';
      return false;
    }
    if (!this.checkoutDate) {
      this.checkoutErrorMsg = 'Check-out date is mandatory.';
      return false;
    }

    const checkinObj = new Date(this.checkinDate);
    const checkoutObj = new Date(this.checkoutDate);
    const now = new Date();

    const checkinTime = new Date(checkinObj.getFullYear(), checkinObj.getMonth(), checkinObj.getDate());
    const checkoutTime = new Date(checkoutObj.getFullYear(), checkoutObj.getMonth(), checkoutObj.getDate());
    const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (checkinTime < todayTime) {
      this.checkinErrorMsg = 'Check-in date cannot be in the past.';
      return false;
    }

    if (checkoutTime <= checkinTime) {
      this.checkoutErrorMsg = 'Check-out date must be after check-in date.';
      return false;
    }

    const diffDays = Math.ceil(Math.abs(checkoutTime.getTime() - checkinTime.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays > 30) {
      this.checkoutErrorMsg = 'Maximum stay per booking is 30 nights.';
      return false;
    }

    const daysUntilCheckin = Math.round((checkinTime.getTime() - todayTime.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilCheckin > 365) {
      this.checkinErrorMsg = 'Booking window cannot exceed 365 days in advance.';
      return false;
    }

    const totalAmount = this.selection!.pricePerNight * diffDays;
    const taxAmount = totalAmount * 0.18;
    const datePatch: Partial<BookingSelection> = {
      checkIn: this.checkinDate,
      checkOut: this.checkoutDate,
      nights: diffDays,
      totalAmount,
      taxAmount,
      grandTotal: totalAmount + taxAmount
    };
    this.selection = { ...this.selection!, ...datePatch };
    this.bookingStore.updateSelectionDates(datePatch);

    return true;
  }

  private validateIdNumber(): boolean {
    if (!this.guestIdType) return false;
    const rawVal = (this.guestIdNumber || '').trim();
    if (rawVal.length === 0) return false;
    if (rawVal.length > 50) {
      this.guestIdNumberError = 'ID number cannot exceed 50 characters.';
      return false;
    }

    if (this.guestIdType === 'Aadhar Card') {
      const cleanAadhaar = rawVal.replace(/[\s-]/g, '');
      if (!/^\d+$/.test(cleanAadhaar)) {
        this.guestIdNumberError = 'Only numeric characters are allowed.';
        return false;
      }
      if (cleanAadhaar.length !== 12) {
        this.guestIdNumberError = 'Aadhar number must contain exactly 12 digits.';
        return false;
      }
      this.guestIdNumberError = '';
      return true;
    }

    if (this.guestIdType === 'PAN') {
      if (!/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(rawVal)) {
        this.guestIdNumberError = 'Enter a valid PAN number (Example: ABCDE1234F).';
        return false;
      }
      this.guestIdNumberError = '';
      return true;
    }

    if (this.guestIdType === 'Passport') {
      if (!/^[A-Z]{1}\d{7}$/.test(rawVal)) {
        this.guestIdNumberError = 'Enter a valid Passport number (Example: A1234567).';
        return false;
      }
      this.guestIdNumberError = '';
      return true;
    }

    // Driver's License — backend imposes no specific pattern beyond MaxLength(50), only a non-empty check here.
    this.guestIdNumberError = '';
    return true;
  }

  /** Exactly 10 digits, first digit 6-9 (valid Indian mobile number range), no spaces/letters/symbols. */
  private static readonly PHONE_PATTERN = /^[6-9][0-9]{9}$/;

  private validatePhone(): boolean {
    const phone = (this.guestPhone || '').trim();
    if (!phone) {
      this.guestPhoneError = 'Phone number is required.';
      return false;
    }
    if (!GuestDetailsComponent.PHONE_PATTERN.test(phone)) {
      this.guestPhoneError = 'Enter a valid 10-digit mobile number starting with 6-9 (digits only, no spaces or country code).';
      return false;
    }
    this.guestPhoneError = '';
    return true;
  }

  private computeValidity(): boolean {
    let isValid = true;

    const datesValid = this.validateStayDates();
    if (!datesValid) isValid = false;

    const countVal = Number(this.guestCount);
    if (isNaN(countVal) || countVal < 1 || countVal > this.maxOccupancy) {
      isValid = false;
      this.guestErrorMsg = countVal < 1
        ? 'Minimum capacity is 1.'
        : `Guest count exceeds room capacity of ${this.maxOccupancy} guest${this.maxOccupancy > 1 ? 's' : ''}.`;
    } else {
      this.guestErrorMsg = '';
    }

    if (!this.validatePhone()) isValid = false;
    if (!this.guestName || !this.guestName.trim()) isValid = false;
    if (!this.guestEmail || !this.guestEmail.trim() || !this.validation.isValidEmail(this.guestEmail)) isValid = false;

    if (!this.validateIdNumber()) isValid = false;

    return isValid;
  }

  validateForm(): void {
    this.formValid = this.computeValidity();
  }

  onSubmit(): void {
    this.validateForm();
    if (!this.formValid) return;

    const guestObj = {
      primaryGuest: {
        name: this.guestName.trim(),
        email: this.guestEmail.trim(),
        phone: this.guestPhone.trim(),
        idType: this.guestIdType,
        idNumber: this.guestIdNumber.trim()
      },
      specialRequests: this.specialRequests ? this.specialRequests.trim() : ''
    };

    this.bookingStore.updateSelectionDates({ checkIn: this.checkinDate, checkOut: this.checkoutDate });
    this.bookingStore.setGuestDetails(guestObj);

    this.router.navigate(['/bookings/invoice-summary']);
  }
}
