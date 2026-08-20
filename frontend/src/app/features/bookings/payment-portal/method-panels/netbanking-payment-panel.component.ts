import { Component, Input } from '@angular/core';

/** Loaded dynamically when the customer selects Net Banking — the bank-selection step itself
 *  happens on Razorpay's hosted page, never this app. */
@Component({
  selector: 'app-netbanking-payment-panel',
  standalone: true,
  template: `
    <div class="method-panel p-3 rounded-3 border" style="background:#f8f9fa;">
      <div class="d-flex align-items-center gap-2 mb-2">
        <i class="bi bi-bank text-warning fs-5"></i>
        <strong class="text-dark">Pay via Net Banking</strong>
      </div>
      <p class="small text-muted mb-0">
        You'll pick your bank and log in through Razorpay's secure page to pay
        <strong>{{ amount }}</strong>. All major Indian banks are supported.
      </p>
    </div>
  `
})
export class NetBankingPaymentPanelComponent {
  @Input() amount = '';
}
