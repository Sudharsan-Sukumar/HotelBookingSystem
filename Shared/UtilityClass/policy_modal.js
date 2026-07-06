// Reusable PolicyConfirmationModal implementation
class PolicyConfirmationModal {
  constructor() {
    this.modalEl = null;
    this.bootstrapModal = null;
    this.onContinueCallback = null;
    this.onBackCallback = null;
    this.init();
  }

  init() {
    // Check if modal container already exists, else create it
    let container = document.getElementById('policyModalContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'policyModalContainer';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div class="modal fade" id="policyConfirmModal" data-bs-backdrop="static" tabindex="-1" aria-labelledby="policyConfirmModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg" style="max-width: 780px;">
          <div class="modal-content custom-modal-content border-0 p-4" style="border-radius: 18px; box-shadow: 0 15px 50px rgba(0,0,0,0.15); background-color: #FAF8F4;">
            <div class="modal-header border-0 pb-0 d-flex align-items-start text-start">
              <div class="d-flex align-items-center gap-3">
                <span class="policy-badge-circle" style="width: 48px; height: 48px; border-radius: 50%; background-color: rgba(212, 175, 55, 0.12); color: #D4AF37; display: inline-flex; align-items: center; justify-content: center; font-size: 1.4rem;">
                  <i class="bi bi-shield-check"></i>
                </span>
                <div>
                  <h5 class="modal-title font-serif text-dark fw-bold fs-4" id="policyConfirmModalLabel">Please Review Our Policies</h5>
                  <p class="text-secondary small mb-0">Please read the following information carefully before continuing.</p>
                </div>
              </div>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" id="btnPolicyCloseHeader"></button>
            </div>
            
            <div class="modal-body text-start pt-3">
              <!-- Scrollable Policy Content Area -->
              <div id="policyModalScrollArea" class="p-3 bg-white rounded border mb-3 text-secondary" style="max-height: 250px; overflow-y: auto; font-size: 0.9rem; line-height: 1.6; border-color: rgba(212, 175, 55, 0.15) !important;">
                <!-- Dynamically populated content -->
              </div>

              <!-- Mandatory User Consent Checkbox -->
              <div class="form-check custom-checkbox-consent py-2 text-start">
                <input class="form-check-input" type="checkbox" id="policyConsentCheckbox" style="cursor: pointer;">
                <label class="form-check-label text-dark small cursor-pointer" for="policyConsentCheckbox" style="user-select: none;">
                  I have read, understood and agree to the Terms & Conditions, Privacy Policy and the applicable policies of The Elegant Enclave.
                </label>
                <div class="text-danger small mt-1 d-none" id="policyConsentErr">Please accept the Terms & Conditions before continuing.</div>
              </div>
            </div>

            <div class="modal-footer border-0 pt-0 d-flex justify-content-end gap-3">
              <button type="button" class="btn btn-action-outline-policy py-2 px-4" id="btnPolicyBack" style="background-color: #FFFFFF; color: #1A0A2E; border: 1px solid rgba(26,10,78,0.25); border-radius: 8px; font-weight: 700; font-size: 0.85rem; height: 38px;">Back</button>
              <button type="button" class="btn btn-action-continue-policy py-2 px-4" id="btnPolicyContinue" disabled style="background-color: #D4AF37; border: none; color: #1A0A2E; border-radius: 8px; font-weight: 700; font-size: 0.85rem; height: 38px;">Continue</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.modalEl = document.getElementById('policyConfirmModal');
    this.bootstrapModal = new bootstrap.Modal(this.modalEl);

    // Setup event listeners for checkbox enabling Continue button
    const checkbox = document.getElementById('policyConsentCheckbox');
    const continueBtn = document.getElementById('btnPolicyContinue');
    const consentErr = document.getElementById('policyConsentErr');

    if (checkbox && continueBtn) {
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          continueBtn.removeAttribute('disabled');
          consentErr.classList.add('d-none');
          continueBtn.style.backgroundColor = '#1A0A2E';
          continueBtn.style.color = '#FFFFFF';
        } else {
          continueBtn.setAttribute('disabled', 'true');
          continueBtn.style.backgroundColor = '#D4AF37';
          continueBtn.style.color = '#1A0A2E';
        }
      });
    }

    // Bind footer buttons
    const btnBack = document.getElementById('btnPolicyBack');
    const btnCloseHeader = document.getElementById('btnPolicyCloseHeader');

    const handleBackClick = () => {
      this.bootstrapModal.hide();
      if (this.onBackCallback) this.onBackCallback();
    };

    if (btnBack) btnBack.addEventListener('click', handleBackClick);
    if (btnCloseHeader) btnCloseHeader.addEventListener('click', handleBackClick);

    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        if (!checkbox.checked) {
          consentErr.classList.remove('d-none');
          return;
        }
        this.bootstrapModal.hide();
        if (this.onContinueCallback) this.onContinueCallback();
      });
    }
  }

  show(options) {
    const titleEl = document.getElementById('policyConfirmModalLabel');
    const scrollArea = document.getElementById('policyModalScrollArea');
    const checkbox = document.getElementById('policyConsentCheckbox');
    const continueBtn = document.getElementById('btnPolicyContinue');
    const consentErr = document.getElementById('policyConsentErr');

    if (titleEl && options.title) titleEl.textContent = options.title;
    if (checkbox) checkbox.checked = false;
    if (continueBtn) {
      continueBtn.setAttribute('disabled', 'true');
      continueBtn.style.backgroundColor = '#D4AF37';
      continueBtn.style.color = '#1A0A2E';
    }
    if (consentErr) consentErr.classList.add('d-none');

    // Populate Policy Content Areas dynamically
    let htmlContent = '';
    if (options.policyType === 'booking') {
      htmlContent = `
        <h6 class="text-dark fw-bold mb-3">Room Booking Policies</h6>
        <strong class="text-dark d-block mb-1 small">CHECK-IN / CHECK-OUT</strong>
        <ul class="ps-3 mb-3">
          <li>Check-in must be today or a future date.</li>
          <li>Check-out must be at least one day after check-in.</li>
          <li>Maximum stay allowed is 30 consecutive nights.</li>
          <li>Reservations can be made up to 365 days in advance.</li>
        </ul>
        <strong class="text-dark d-block mb-1 small">GUESTS & ROOMS</strong>
        <ul class="ps-3 mb-0">
          <li>Each booking must include at least one guest.</li>
          <li>Guest count cannot exceed the selected room occupancy.</li>
          <li>Maximum five rooms can be booked in a single reservation.</li>
        </ul>
      `;
    } else if (options.policyType === 'payment') {
      htmlContent = `
        <h6 class="text-dark fw-bold mb-3">Payment & Pricing Policies</h6>
        <strong class="text-dark d-block mb-1 small">PRICING</strong>
        <ul class="ps-3 mb-3">
          <li>Applicable GST (12%) is included in the final payable amount.</li>
          <li>Final booking amount is displayed before payment confirmation.</li>
        </ul>
        <strong class="text-dark d-block mb-1 small">PAYMENT</strong>
        <ul class="ps-3 mb-0">
          <li>Secure payment methods supported: Credit Card, Debit Card, UPI, Net Banking, Wallet.</li>
          <li>Booking status changes: Pending &rarr; Payment Successful &rarr; Confirmed.</li>
          <li>Completed stays are automatically marked after the checkout date.</li>
        </ul>
      `;
    } else if (options.policyType === 'modification') {
      htmlContent = `
        <h6 class="text-dark fw-bold mb-3">Booking Modification Policy</h6>
        <strong class="text-dark d-block mb-1 small">ELIGIBILITY</strong>
        <ul class="ps-3 mb-3">
          <li>Only Confirmed or Modified bookings may be modified.</li>
          <li>Modifications are not allowed within 12 hours of check-in.</li>
        </ul>
        <strong class="text-dark d-block mb-1 small">DATE CHANGES</strong>
        <ul class="ps-3 mb-3">
          <li>Updated dates cannot be in the past. Checkout must be after check-in.</li>
          <li>Maximum stay remains 30 nights. Room availability will be revalidated.</li>
        </ul>
        <strong class="text-dark d-block mb-1 small">PRICING</strong>
        <ul class="ps-3 mb-0">
          <li>Charges recalculated: Higher amount &rarr; Customer pays difference; Lower amount &rarr; Refund processed.</li>
          <li>All modifications are recorded for audit purposes.</li>
        </ul>
      `;
    } else if (options.policyType === 'cancellation') {
      htmlContent = `
        <h6 class="text-dark fw-bold mb-3">Cancellation & Refund Policy</h6>
        <strong class="text-dark d-block mb-1 small">ELIGIBILITY</strong>
        <ul class="ps-3 mb-3">
          <li>Only Confirmed or Modified bookings can be cancelled.</li>
        </ul>
        <strong class="text-dark d-block mb-1 small">REFUND POLICY</strong>
        <ul class="ps-3 mb-3">
          <li>More than 48 hours before check-in &rarr; 100% Refund.</li>
          <li>Between 24–48 hours &rarr; 50% Refund.</li>
          <li>Less than 24 hours &rarr; No Refund.</li>
        </ul>
        <strong class="text-dark d-block mb-1 small">REFUND PROCESS</strong>
        <ul class="ps-3 mb-0">
          <li>Credited to original method (Initiated &rarr; Processing &rarr; Completed).</li>
          <li>Refunds take 3–7 business days to reflect.</li>
        </ul>
      `;
    } else if (options.policyType === 'profile') {
      htmlContent = `
        <h6 class="text-dark fw-bold mb-3">Profile & Security Policy</h6>
        <ul class="ps-3 mb-0">
          <li>Keep your personal information accurate and up to date.</li>
          <li>Password changes require your current password.</li>
          <li>Passwords are securely encrypted.</li>
          <li>Personal information will never be shared without consent.</li>
        </ul>
      `;
    }

    if (scrollArea) scrollArea.innerHTML = htmlContent;

    this.onContinueCallback = options.onContinue;
    this.onBackCallback = options.onBack;

    this.bootstrapModal.show();
  }
}

// Instantiate globally to be reused
window.policyModal = new PolicyConfirmationModal();
