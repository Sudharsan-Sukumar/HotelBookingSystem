import { Component, Input } from '@angular/core';

/** Loaded dynamically for both "Credit Card" and "Debit Card" (same panel, see the
 *  PAYMENT_METHOD_PANELS map in payment-portal.component.ts) — Razorpay's hosted page collects
 *  the actual card number/CVV, never this app. */
@Component({
  selector: 'app-card-payment-panel',
  standalone: true,
  template: `
    <div class="method-panel p-3 rounded-3 border" style="background:#f8f9fa;">
      <div class="d-flex align-items-center gap-2 mb-2">
        <i class="bi bi-credit-card-2-front text-warning fs-5"></i>
        <strong class="text-dark">Pay via {{ cardLabel }}</strong>
      </div>
      <p class="small text-muted mb-0">
        You'll enter your card details directly on Razorpay's PCI-DSS-compliant hosted page to pay
        <strong>{{ amount }}</strong>. Visa, Mastercard, RuPay, and Amex are accepted.
      </p>
    </div>
  `
})
export class CardPaymentPanelComponent {
  @Input() amount = '';
  @Input() cardLabel: 'Credit Card' | 'Debit Card' = 'Credit Card';
}
