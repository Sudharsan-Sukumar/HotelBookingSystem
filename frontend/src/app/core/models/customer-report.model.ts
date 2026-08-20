/** Mirrors Features/Reports/DTOs/CustomerBookingSummaryDto.cs and CustomerTransactionReportDto.cs exactly. */

export interface CustomerBookingSummaryDto {
  bookingId: number;
  bookingCustomId: string;
  hotelName: string;
  roomTypeName: string;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: number;
  status: string;
}

/** Type is server-computed: "Refund" if the underlying payment status is "Refunded", else "Payment". */
export interface CustomerTransactionReportDto {
  transactionId: string;
  bookingCustomId: string;
  amount: number;
  walletAmountUsed: number;
  paymentMethod: string;
  status: string;
  paymentDate: string;
  type: string;
}
