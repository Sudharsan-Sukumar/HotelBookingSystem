import { signalStore, withState, withMethods, withHooks, patchState, getState } from '@ngrx/signals';
import { IdProofType } from '../../../core/models/booking.model';
import { BookingResponseDto } from '../../../core/models/booking.model';
import { PaymentMethod } from '../../../core/models/payment.model';

/** Written by room-selection, refined (date/price recompute) by guest-details. */
export interface BookingSelection {
  roomTypeId: number;
  roomTypeName: string;
  hotelId: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  pricePerNight: number;
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  adults?: number;
  children?: number;
  maxOccupancy: number;
}

export interface PrimaryGuest {
  name: string;
  email: string;
  phone: string;
  idType: IdProofType | '';
  idNumber: string;
}

export interface GuestDetailsPayload {
  primaryGuest: PrimaryGuest;
  specialRequests: string;
}

interface BookingWorkflowState {
  selection: BookingSelection | null;
  guestDetails: GuestDetailsPayload | null;
  createdBooking: BookingResponseDto | null;
  selectedPaymentMethod: PaymentMethod | '';
  useWalletBalance: boolean;
  isModification: boolean;
  modifyPriceDiff: number | null;
  lastBookingId: number | null;
}

const initialState: BookingWorkflowState = {
  selection: null,
  guestDetails: null,
  createdBooking: null,
  selectedPaymentMethod: '',
  useWalletBalance: false,
  isModification: false,
  modifyPriceDiff: null,
  lastBookingId: null
};

// The single sessionStorage key this store persists to — replaces the 8 separate keys
// (hbs_booking_selection, hbs_booking_guest, hbs_created_booking, hbs_selected_payment_method,
// hbs_use_wallet_balance, isModification, hbs_modify_price_diff, hbs_last_booking_id) that were
// previously written directly, and duplicated into localStorage as well, by five different
// components. sessionStorage-only (no localStorage mirror): the localStorage copy only ever
// existed as a fallback read alongside sessionStorage, never verified as intentionally
// cross-session — dropping it removes duplicated writes without losing any behavior the flow
// actually depended on (a reload mid-booking still works via the sessionStorage rehydrate below).
const STORAGE_KEY = 'hbs_booking_workflow';

function loadPersisted(): Partial<BookingWorkflowState> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persist(state: BookingWorkflowState): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Owns the entire booking workflow's client-side state (room selection -> guest details ->
 * created booking -> payment choice -> modification hand-off), replacing the raw
 * sessionStorage/localStorage reads and writes that used to be scattered across
 * room-selection, guest-details, invoice-summary, payment-portal, modify-step3 and
 * booking-success. Every component in that flow now reads/writes through this store instead of
 * touching Web Storage directly — Web Storage is only this store's own persistence detail (see
 * withHooks below), not something any component needs to know exists.
 */
export const BookingWorkflowStore = signalStore(
  { providedIn: 'root' },
  withState<BookingWorkflowState>(initialState),
  withMethods((store) => {
    // Every mutating method below ends by persisting the store's full current state — @ngrx/signals'
    // withHooks only runs once at construction (not on every change), so there is no store-level
    // "effect" to hang this off; centralizing it here means each method is one patchState + one call.
    const persistCurrent = () => persist(getState(store));

    return {
      setSelection(selection: BookingSelection): void {
        patchState(store, { selection });
        persistCurrent();
      },

      /** guest-details recomputes checkIn/checkOut/nights/pricing after date validation. */
      updateSelectionDates(patch: Partial<BookingSelection>): void {
        const current = store.selection();
        if (!current) return;
        patchState(store, { selection: { ...current, ...patch } });
        persistCurrent();
      },

      setGuestDetails(guestDetails: GuestDetailsPayload): void {
        patchState(store, { guestDetails });
        persistCurrent();
      },

      setCreatedBooking(createdBooking: BookingResponseDto, paymentMethod: PaymentMethod | '', useWalletBalance: boolean): void {
        patchState(store, { createdBooking, selectedPaymentMethod: paymentMethod, useWalletBalance });
        persistCurrent();
      },

      /** modify-step3's hand-off to payment-portal for an existing (not freshly-created) booking. */
      startModification(booking: BookingResponseDto, priceDiff: number): void {
        patchState(store, {
          createdBooking: booking,
          isModification: true,
          modifyPriceDiff: priceDiff
        });
        persistCurrent();
      },

      setLastBookingId(bookingId: number): void {
        patchState(store, { lastBookingId: bookingId, isModification: false });
        persistCurrent();
      },

      /** Clears all workflow state — called once the booking is confirmed (booking-success) so a
       *  stale selection/guest/payment state can never leak into the next, unrelated booking. */
      reset(): void {
        patchState(store, initialState);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    };
  }),
  withHooks({
    onInit(store) {
      // Rehydrate on load — a page refresh mid-booking (e.g. on guest-details or payment-portal)
      // must not lose the in-progress selection, exactly like the sessionStorage reads it replaces.
      const persisted = loadPersisted();
      if (Object.keys(persisted).length > 0) {
        patchState(store, persisted);
      }
    }
  })
);
