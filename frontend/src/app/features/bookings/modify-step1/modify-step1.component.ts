import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../../layout/navbar/navbar.component';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { BookingResponseDto } from '../../../core/models/booking.model';
import { HotelResponseDto, RoomTypeResponseDto } from '../../../core/models/hotel.model';

export const MODIFY_SELECTION_KEY = 'hbs_modify_selection';

/**
 * Step 1 of the Modify Booking wizard — real-backend version.
 *
 * Backend gap (documented, not invented around): ModifyBookingDto (Features/Bookings/DTOs/
 * ModifyBookingDto.cs) carries CheckInDate/CheckOutDate/RowVersion plus an optional GuestCount used
 * only as a server-side safety guard — there is no way to actually change the room type or guest
 * count via a modification (a Booking has no guest-count column at all). The original mock UI's
 * room-reselection grid has therefore been removed rather than left wired to a non-existent
 * capability; the guest count selector is now a disabled, capacity-labeled display only
 * (TC001 fix — it previously offered an editable 1-10 range with no relationship to the booked
 * room's actual occupancy limit).
 *
 * The 24-hour-before-checkin lock and "already checked in" rules are enforced server-side by
 * BookingsController.ModifyBooking; this component mirrors them client-side only for immediate UX
 * feedback and still lets the real PUT call be the final authority.
 */
@Component({
  selector: 'app-modify-step1',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent],
  templateUrl: './modify-step1.component.html',
  styleUrl: './modify-step1.component.scss'
})
export class ModifyStep1Component implements OnInit {
  private readonly base = environment.apiUrl;

  bookingId = '';
  booking: (BookingResponseDto & { checkInDay?: string; checkOutDay?: string }) | null = null;

  generalError = '';
  formDisabled = false;

  checkinDate = '';
  checkoutDate = '';
  guests = 2;
  todayIso = '';

  checkinError = '';
  checkoutError = '';
  guestsError = '';
  guestsErrorIsWarning = false;

  roomsLoaded = false;
  maxGuestsForSelection = 2;
  isValidState = false;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.todayIso = this.toIso(new Date());
    this.bookingId = this.route.snapshot.paramMap.get('bookingId') || '';

    if (!this.bookingId) {
      this.generalError = 'Booking information could not be found. Please return to My Bookings and try again.';
      return;
    }

    this.http.get<ApiResponse<BookingResponseDto>>(`${this.base}/bookings/${this.bookingId}`).subscribe({
      next: (res) => this.applyBooking(res.data),
      error: () => {
        this.generalError = 'Booking information could not be found. Please return to My Bookings and try again.';
      }
    });
  }

  private applyBooking(booking: BookingResponseDto): void {
    this.booking = {
      ...booking,
      checkInDay: new Date(booking.checkInDate).toLocaleDateString('en-US', { weekday: 'long' }),
      checkOutDay: new Date(booking.checkOutDate).toLocaleDateString('en-US', { weekday: 'long' })
    };

    const notModifiable = ['CheckedIn', 'CheckedOut', 'Completed', 'Cancelled'];
    if (notModifiable.includes(booking.status)) {
      this.formDisabled = true;
      this.generalError = booking.status === 'Cancelled'
        ? 'This booking has been cancelled and cannot be modified.'
        : booking.status === 'Completed' || booking.status === 'CheckedOut'
          ? 'This booking has already been completed and cannot be modified.'
          : 'Your stay has already begun. Modifications are not permitted once you have checked in.';
    } else {
      const hoursUntilCheckin = (new Date(booking.checkInDate).getTime() - Date.now()) / 3600000;
      if (hoursUntilCheckin < 24) {
        this.formDisabled = true;
        this.generalError = 'Modification is locked — check-in is less than 24 hours away. Please contact the hotel reception for assistance.';
      }
    }

    this.checkinDate = this.toIso(new Date(booking.checkInDate));
    this.checkoutDate = this.toIso(new Date(booking.checkOutDate));
    this.loadRoomTypeCapacity(booking.hotelName, booking.roomTypeName);

    this.validate();
  }

  /** TC001 fix: resolves the ACTUAL booked room type's capacity (not a hardcoded guess) via the
   * two existing, unauthenticated-safe GET endpoints — BookingResponseDto carries hotelName/
   * roomTypeName as strings only, with no hotelId/roomTypeId, so this is a name-matched lookup. */
  private loadRoomTypeCapacity(hotelName: string, roomTypeName: string): void {
    this.http.get<ApiResponse<HotelResponseDto[]>>(`${this.base}/hotels`).subscribe({
      next: (res) => {
        const hotel = (res.data || []).find(h => h.name === hotelName);
        if (!hotel) return;
        this.http.get<ApiResponse<RoomTypeResponseDto[]>>(`${this.base}/hotels/${hotel.id}/roomtypes`).subscribe({
          next: (rtRes) => {
            const roomType = (rtRes.data || []).find(rt => rt.name === roomTypeName);
            if (roomType) {
              this.maxGuestsForSelection = roomType.capacity;
              this.guests = roomType.capacity;
            }
          },
          error: () => { /* keep the safe default below */ }
        });
      },
      error: () => { /* keep the safe default below */ }
    });
  }

  get adultCount(): number { return this.guests; }
  get childCount(): number { return 0; }

  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private parseLocalMidnight(str: string): Date | null {
    if (!str) return null;
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  onDateOrGuestsChanged(): void {
    this.validate();
  }

  /** Mirrors ModifyBookingDto.Validate() on the backend exactly. */
  validate(): boolean {
    let isValid = true;
    this.checkinError = '';
    this.checkoutError = '';

    if (!this.booking) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let checkinD: Date | null = null;
    let checkoutD: Date | null = null;

    if (!this.checkinDate) {
      isValid = false;
    } else {
      checkinD = this.parseLocalMidnight(this.checkinDate);
      if (!checkinD) {
        isValid = false;
        this.checkinError = '❌ Enter a valid check-in date.';
      } else if (checkinD.getTime() < today.getTime()) {
        isValid = false;
        this.checkinError = '❌ Check-in date cannot be in the past.';
      }
    }

    if (!this.checkoutDate) {
      isValid = false;
    } else {
      checkoutD = this.parseLocalMidnight(this.checkoutDate);
      if (!checkoutD) {
        isValid = false;
        this.checkoutError = '❌ Enter a valid check-out date.';
      } else if (checkinD && checkoutD.getTime() <= checkinD.getTime()) {
        isValid = false;
        this.checkoutError = '❌ Check-out date must be after check-in.';
      } else if (checkinD) {
        const diffDays = Math.ceil((checkoutD.getTime() - checkinD.getTime()) / 86400000);
        if (diffDays > 30) {
          isValid = false;
          this.checkoutError = '❌ Maximum stay duration is 30 nights.';
        }
      }
    }

    this.isValidState = isValid;
    return isValid;
  }

  resetForm(): void {
    if (!this.booking) return;
    this.checkinDate = this.toIso(new Date(this.booking.checkInDate));
    this.checkoutDate = this.toIso(new Date(this.booking.checkOutDate));
    // Guest count is a fixed, disabled display (see loadRoomTypeCapacity) — resetting the dates
    // must not touch it.
    this.validate();
  }

  get submitLabel(): string {
    return 'Review Changes';
  }

  onSubmit(): void {
    if (this.formDisabled || !this.booking) return;
    if (!this.validate()) return;

    const origCheckin = this.toIso(new Date(this.booking.checkInDate));
    const origCheckout = this.toIso(new Date(this.booking.checkOutDate));
    if (this.checkinDate === origCheckin && this.checkoutDate === origCheckout) {
      this.generalError = '⚠️ No changes detected. Please select different stay dates to continue.';
      return;
    }
    this.generalError = '';

    const selection = {
      bookingId: this.bookingId,
      draftChanges: {
        checkIn: this.checkinDate,
        checkOut: this.checkoutDate,
        guests: this.guests
      }
    };
    sessionStorage.setItem(MODIFY_SELECTION_KEY, JSON.stringify(selection));
    this.router.navigate(['/bookings/modify', this.bookingId, 'step2']);
  }
}
