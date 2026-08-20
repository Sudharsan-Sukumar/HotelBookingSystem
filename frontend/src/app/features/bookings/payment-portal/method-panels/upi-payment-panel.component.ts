import { Component, Input } from '@angular/core';

/** Loaded dynamically (via ViewContainerRef.createComponent) when the customer selects UPI —
 *  see payment-portal.component.ts's `loadMethodPanel`. Purely informational: the actual UPI
 *  collection UI is Razorpay's own hosted page, never this app's (see the "we never store your
 *  card/UPI details" note on the page), so there is no form here to submit. */
@Component({
  selector: 'app-upi-payment-panel',
  standalone: true,
  template: `
    <div class="method-panel p-3 rounded-3 border" style="background:#f8f9fa;">
      <div class="d-flex align-items-center gap-2 mb-2">
        <i class="bi bi-qr-code text-warning fs-5"></i>
        <strong class="text-dark">Pay via UPI</strong>
      </div>
      <p class="small text-muted mb-0">
        You'll scan a QR code or enter your UPI ID on Razorpay's secure page to pay
        <strong>{{ amount }}</strong>. Supports Google Pay, PhonePe, Paytm, and any UPI app.
      </p>
    </div>
  `
})
export class UpiPaymentPanelComponent {
  @Input() amount = '';
}
