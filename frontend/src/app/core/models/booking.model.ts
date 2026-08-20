/** Mirrors Features/Bookings/DTOs/*.cs exactly. */

export const ID_PROOF_TYPES = ['Aadhar Card', 'Passport', "Driver's License", 'PAN'] as const;
export type IdProofType = typeof ID_PROOF_TYPES[number];

export interface BookingRequestDto {
  hotelId: number;
  roomTypeId: number;
  idProofType: IdProofType | '';
  idProofNumber: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfRooms: number;
  specialRequests?: string;
}

export interface BookingResponseDto {
  id: number;
  bookingCustomId: string;
  hotelName: string;
  roomTypeName: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfRooms: number;
  specialRequests?: string | null;
  idProofType?: string | null;
  idProofNumber?: string | null;
  baseCost: number;
  taxAmount: number;
  walletAmountUsed: number;
  totalAmount: number;
  status: BookingStatus;
  createdAt: string;
  rowVersion: string;
}

export type BookingStatus =
  | 'Pending Payment'
  | 'Pending Additional Payment'
  | 'Confirmed'
  | 'CheckedIn'
  | 'CheckedOut'
  | 'Completed'
  | 'Cancelled';

export interface ModifyBookingDto {
  checkInDate: string;
  checkOutDate: string;
  rowVersion?: string | null;
}

export interface AdminCancelBookingDto {
  reason: string;
}
