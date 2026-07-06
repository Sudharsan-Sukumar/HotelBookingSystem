document.addEventListener('DOMContentLoaded', () => {
  const tableCardWrapper = document.querySelector('.table-card-wrapper');
  const statRow = document.querySelector('.row.g-3.mb-4');
  const filterRow = document.querySelector('.filter-row-container');

  // Verify auth session credentials. Hide data if unauthenticated.
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) {
    if (tableCardWrapper) {
      tableCardWrapper.innerHTML = `
        <div class="profile-card bg-white p-5 rounded border text-center shadow-sm">
          <div class="mb-4 text-warning" style="font-size: 3rem;"><i class="bi bi-shield-lock"></i></div>
          <h3 class="font-serif text-dark mb-3">Login to View Bookings</h3>
          <p class="text-muted mb-4 small">You must be logged in to view, modify, or cancel your personal reservations.</p>
          <a href="../authentication/login.html" class="btn btn-confirm-pay px-4 py-2" style="background-color: #1A0A2E; color: white; border-radius: 8px;">Login to Continue</a>
        </div>
      `;
    }
    if (statRow) statRow.style.display = 'none';
    if (filterRow) filterRow.style.display = 'none';
    return;
  }

  const btnCancel = document.getElementById('btnCancel');
  const btnConfirmCancel = document.getElementById('btnConfirmCancel');
  const lblStatusBadge = document.getElementById('lblStatusBadge');
  
  const upcomingCount = document.getElementById('upcomingCount');
  const cancelledCount = document.getElementById('cancelledCount');
  const actionButtonsGroup = document.getElementById('actionButtonsGroup');
  
  let cancelModal;
  
  // Initialize Bootstrap modal instance
  const modalEl = document.getElementById('cancelConfirmModal');
  if (modalEl) {
    cancelModal = new bootstrap.Modal(modalEl);
  }

  // 1. Cancel Click Action
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      if (cancelModal) {
        cancelModal.show();
      }
    });
  }

  const cancelReasonSelect = document.getElementById('cancelReasonSelect');
  const otherReasonWrapper = document.getElementById('otherReasonWrapper');
  const otherReasonText = document.getElementById('otherReasonText');
  const cancelReasonErr = document.getElementById('cancelReasonErr');
  const otherReasonErr = document.getElementById('otherReasonErr');

  const btnProceedCancel = document.getElementById('btnProceedCancel');
  const btnCancelBack = document.getElementById('btnCancelBack');
  const btnFinalConfirm = document.getElementById('btnFinalConfirm');
  const btnSuccessClose = document.getElementById('btnSuccessClose');

  const cancelPanelReason = document.getElementById('cancelPanelReason');
  const cancelPanelConfirm = document.getElementById('cancelPanelConfirm');
  const cancelPanelLoading = document.getElementById('cancelPanelLoading');
  const cancelPanelSuccess = document.getElementById('cancelPanelSuccess');

  // Show Specifying Textarea conditionally if "Other" reason is selected
  if (cancelReasonSelect) {
    cancelReasonSelect.addEventListener('change', () => {
      if (cancelReasonSelect.value === 'other') {
        otherReasonWrapper.classList.remove('d-none');
      } else {
        otherReasonWrapper.classList.add('d-none');
      }
    });
  }

  // 1. Cancel Click Action - Reset to first panel
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      // Trigger reusable PolicyConfirmationModal before cancellation steps
      window.policyModal.show({
        title: 'Review Cancellation & Refund Policy',
        policyType: 'cancellation',
        onContinue: () => {
          // Open reason selectors modal
          if (cancelPanelReason) cancelPanelReason.classList.remove('d-none');
          if (cancelPanelConfirm) cancelPanelConfirm.classList.add('d-none');
          if (cancelPanelLoading) cancelPanelLoading.classList.add('d-none');
          if (cancelPanelSuccess) cancelPanelSuccess.classList.add('d-none');
          
          if (cancelReasonSelect) cancelReasonSelect.value = '';
          if (otherReasonWrapper) otherReasonWrapper.classList.add('d-none');
          if (otherReasonText) otherReasonText.value = '';
          if (cancelReasonErr) cancelReasonErr.classList.add('d-none');
          if (otherReasonErr) otherReasonErr.classList.add('d-none');

          if (cancelModal) {
            cancelModal.show();
          }
        },
        onBack: () => {
          console.log('User cancelled cancellation policy check');
        }
      });
    });
  }

  // 2. Proceed to Cancel Validation Check
  if (btnProceedCancel) {
    btnProceedCancel.addEventListener('click', () => {
      let valid = true;

      if (!cancelReasonSelect.value) {
        cancelReasonErr.classList.remove('d-none');
        valid = false;
      } else {
        cancelReasonErr.classList.add('d-none');
      }

      if (cancelReasonSelect.value === 'other') {
        if (!otherReasonText.value.trim()) {
          otherReasonErr.classList.remove('d-none');
          valid = false;
        } else {
          otherReasonErr.classList.add('d-none');
        }
      }

      if (!valid) return;

      // Transition to panel 2
      cancelPanelReason.classList.add('d-none');
      cancelPanelConfirm.classList.remove('d-none');
    });
  }

  // 3. Back button click inside modal
  if (btnCancelBack) {
    btnCancelBack.addEventListener('click', () => {
      cancelPanelConfirm.classList.add('d-none');
      cancelPanelReason.classList.remove('d-none');
    });
  }

  // 4. Final Confirm click - Transition to loading then success
  if (btnFinalConfirm) {
    btnFinalConfirm.addEventListener('click', () => {
      cancelPanelConfirm.classList.add('d-none');
      cancelPanelLoading.classList.remove('d-none');

      // Simulate 1.5 second loading latency
      setTimeout(() => {
        cancelPanelLoading.classList.add('d-none');
        cancelPanelSuccess.classList.remove('d-none');

        // Update parent page badge UI to Cancelled status
        if (lblStatusBadge) {
          lblStatusBadge.textContent = 'Cancelled';
          lblStatusBadge.className = 'status-upcoming-badge cancelled py-1 px-3 rounded-pill';
        }

        // Update dashboard counts
        if (upcomingCount) upcomingCount.textContent = 'Upcoming Stay (0)';
        if (cancelledCount) cancelledCount.textContent = 'Cancelled (2)';

        // Remove modify/cancel buttons and replace with View Details only
        if (actionButtonsGroup) {
          actionButtonsGroup.innerHTML = `
            <a href="../hotels/hotel_details.html" class="btn btn-action-view py-1 px-3 d-flex align-items-center justify-content-between gap-2">View Details <i class="bi bi-chevron-right"></i></a>
          `;
        }

        // Generate and append a simulated success cancel notification inside sessionStorage logs
        const mockNotifs = JSON.parse(sessionStorage.getItem('mockNotifications') || '[]');
        mockNotifs.unshift({
          id: 'notif_cancel_' + Date.now(),
          cat: 'booking',
          title: 'Booking Cancelled',
          desc: 'Your reservation has been cancelled successfully. 90% refund has been initiated to your original payment method.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: true
        });
        sessionStorage.setItem('mockNotifications', JSON.stringify(mockNotifs));

      }, 1500);
    });
  }
});
