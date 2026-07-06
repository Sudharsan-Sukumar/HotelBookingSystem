// Reusable PageBackButton component
class PageBackButton {
  constructor() {
    this.init();
  }

  init() {
    const path = window.location.pathname;
    const isExcluded = path.endsWith('index.html') || 
                       path === '/' ||
                       path.includes('/authentication/') || 
                       path.includes('login.html') || 
                       path.includes('register.html');
                       
    if (isExcluded) return;

    // Check if back navigation container already exists
    let container = document.getElementById('globalBackNavContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'globalBackNavContainer';
      container.className = 'container px-xl-5';
      container.style.marginTop = '20px';
      container.style.marginBottom = '16px';
      container.style.textAlign = 'left';

      // Insert immediately below custom-navbar navigation header
      const navbar = document.querySelector('.custom-navbar');
      if (navbar) {
        navbar.insertAdjacentElement('afterend', container);
      } else {
        document.body.insertBefore(container, document.body.firstChild);
      }
    }

    container.innerHTML = `
      <button class="btn btn-global-back d-inline-flex align-items-center gap-2" id="btnGlobalBack" style="
        background-color: #FFFFFF;
        border: 1px solid #E5E5E5;
        border-radius: 12px;
        padding: 14px 22px;
        color: #1A0A2E;
        font-family: 'Poppins', sans-serif;
        font-weight: 600;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 200ms ease-in-out;
        box-shadow: 0 2px 4px rgba(0,0,0,0.02);
      ">
        <i class="bi bi-arrow-left"></i> Back
      </button>
    `;

    // Inject hover styles in header
    let styleTag = document.getElementById('globalBackNavStyles');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'globalBackNavStyles';
      styleTag.innerHTML = `
        .btn-global-back:hover {
          background-color: #FAF8F4 !important;
          box-shadow: 0 4px 12px rgba(26,10,46,0.06) !important;
          border-color: #D4AF37 !important;
        }
      `;
      document.head.appendChild(styleTag);
    }

    const btn = document.getElementById('btnGlobalBack');
    if (btn) {
      btn.addEventListener('click', () => {
        this.handleBackNavigation();
      });
    }
  }

  handleBackNavigation() {
    // Check if bootstrap modal is open and close it instead
    const activeModalEl = document.querySelector('.modal.show');
    if (activeModalEl) {
      const modalInstance = bootstrap.Modal.getInstance(activeModalEl);
      if (modalInstance) {
        modalInstance.hide();
        return;
      }
    }

    // Determine current page and destination route
    const url = window.location.href;
    let destination = '../../index.html'; // Default back destination (Landing page)
    let hasUnsavedChanges = false;

    if (url.includes('search_results.html')) {
      destination = '../../index.html';
    } else if (url.includes('hotel_details.html')) {
      destination = 'search_results.html';
    } else if (url.includes('room_selection.html')) {
      destination = '../hotels/hotel_details.html';
    } else if (url.includes('guest_details.html')) {
      destination = 'room_selection.html';
      hasUnsavedChanges = true; // Guest input fields unsaved
    } else if (url.includes('invoice_summary.html')) {
      destination = 'guest_details.html';
    } else if (url.includes('payment_portal.html')) {
      destination = 'invoice_summary.html';
    } else if (url.includes('booking_success.html')) {
      destination = 'my_bookings.html';
    } else if (url.includes('my_bookings.html')) {
      destination = '../../index.html';
    } else if (url.includes('modify_booking_step1.html')) {
      destination = 'my_bookings.html';
      hasUnsavedChanges = true; // Modification details unsaved
    } else if (url.includes('modify_booking_step2.html')) {
      destination = 'modify_booking_step1.html';
    } else if (url.includes('modify_booking_step3.html')) {
      destination = 'modify_booking_step2.html';
    } else if (url.includes('notifications.html')) {
      destination = '../../index.html';
    } else if (url.includes('profile.html')) {
      destination = '../../index.html';
      hasUnsavedChanges = true; // Contact details fields changes unsaved
    }

    // Prompt if current panel contains unsaved changes
    if (hasUnsavedChanges) {
      const discard = confirm("Discard your unsaved changes?");
      if (!discard) return;
    }

    window.location.href = destination;
  }
}

// Instantiate globally to be active across all pages
window.globalBackNav = new PageBackButton();
