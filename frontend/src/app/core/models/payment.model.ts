/** Mirrors Features/Payments/DTOs/RazorpayDtos.cs exactly (customer-facing payment link flow). */
export const PAYMENT_METHODS = ['Credit Card', 'Debit Card', 'Net Banking', 'UPI'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

export interface CreatePaymentLinkDto {
  bookingId: number;
  paymentMethod: PaymentMethod | '';
  amountToPay: number;
  useWalletBalance: boolean;
}

export interface PaymentLinkResponseDto {
  paymentLinkId: string;
  /** Empty when the wallet alone covered the full amount (booking confirmed without Razorpay). */
  paymentUrl: string;
  reference: string;
  /** Amount actually charged by THIS link — may be less than the full outstanding balance, see below. */
  amount: number;
  bookingStatus: string;
  /** Split-Payment Fallback: true when the booking's outstanding balance exceeded this Razorpay
   * account's single-link cap and had to be split into multiple sequential payments. */
  isPartialPayment: boolean;
  /** What's still owed after this link is paid — 0 when isPartialPayment is false. */
  remainingAfterThisPayment: number;
}

export interface RazorpayPaymentStatusDto {
  reference: string;
  status: string;
  razorpayPaymentId?: string | null;
  amount: number;
  /** Mirrors PaymentLinkResponseDto's split-payment fields — lets the status poll tell "this chunk
   * paid, booking fully settled" apart from "this chunk paid, more still owed". */
  isPartialPayment: boolean;
  remainingAfterThisPayment: number;
  bookingStatus: string;
}

/** Matches Features/Payments/DTOs/AdminTransactionDto.cs (curl-confirmed
 *  against GET /api/admin/payments). */
export interface AdminTransactionDto {
  id: number;
  bookingId: number;
  bookingCustomId: string;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  status: string;
  gatewayResponse: string | null;
  paymentDate: string;
}

/** Matches Features/Payments/DTOs/AdminRefundOverrideDto.cs. Reason must be >= 10 chars. */
export interface AdminRefundOverrideDto {
  bookingId: number;
  amount: number;
  reason: string;
}

/** Matches Features/Payments/DTOs/AdminManualPaymentDto.cs. Reason must be >= 10 chars. */
export interface AdminManualPaymentDto {
  bookingId: number;
  amount: number;
  reason: string;
}

/** Matches Features/Payments/DTOs/RefundResponseDto.cs. */
export interface RefundResponseDto {
  id: number;
  bookingId: number;
  bookingCustomId: string;
  amount: number;
  status: string;
  destination: string;
  isAdminOverride: boolean;
  reason: string | null;
  createdAt: string;
  completedAt: string | null;
}
