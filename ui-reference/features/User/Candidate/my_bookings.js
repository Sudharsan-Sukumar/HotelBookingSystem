const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');
const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

if (!isLoggedIn || userRole !== 'Customer') {
  window.location.href = '../../../features/Auth/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  let allBookings = HotelState.getBookingsByCustomer(userId);
  let currentFilter = 'All';
  let currentPage = 1;
  let rowsPerPage = 10;

  const tbody = document.querySelector('.my-bookings-table tbody');
  
  function renderTable() {
    
    let filteredBookings = allBookings;
    if (currentFilter !== 'All') {
      filteredBookings = allBookings.filter(b => {
        const lc = HotelState.getBookingLifecycle(b);
        if (currentFilter === 'Upcoming')   return lc.stage === 'upcoming' || lc.stage === 'upcoming-locked';
        if (currentFilter === 'Active')     return lc.stage === 'active';
        if (currentFilter === 'Completed')  return lc.stage === 'completed';
        if (currentFilter === 'Cancelled')  return lc.stage === 'cancelled';
        return true;
      });
    }

    if (!tbody) return;
    tbody.innerHTML = '';

    // If page goes out of bounds due to filtering
    const totalPages = Math.ceil(filteredBookings.length / rowsPerPage) || 1;
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, filteredBookings.length);
    const paginated = filteredBookings.slice(startIndex, endIndex);

    // Update Showing X to Y of Z text
    const showingText = document.querySelector('.table-pagination-footer > span.text-muted');
    if (showingText) {
      if (filteredBookings.length === 0) {
        showingText.textContent = 'Showing 0 to 0 of 0 bookings';
      } else {
        showingText.textContent = `Showing ${startIndex + 1} to ${endIndex} of ${filteredBookings.length} bookings`;
      }
    }

    // Render pagination controls (Prev, Pages, Next)
    const paginationControls = document.querySelector('.pagination-controls');
    if (paginationControls) {
      paginationControls.innerHTML = '';
      
      const prevBtn = document.createElement('button');
      prevBtn.className = 'btn btn-pagination-arrow';
      prevBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
      prevBtn.type = 'button';
      if (currentPage === 1) prevBtn.disabled = true;
      prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
          currentPage--;
          renderTable();
        }
      });
      paginationControls.appendChild(prevBtn);

      for (let i = 1; i <= totalPages; i++) {
        const pageSpan = document.createElement('span');
        pageSpan.className = `btn-pagination-number ${i === currentPage ? 'active' : ''}`;
        pageSpan.textContent = i;
        pageSpan.style.cursor = 'pointer';
        pageSpan.addEventListener('click', () => {
          currentPage = i;
          renderTable();
        });
        paginationControls.appendChild(pageSpan);
      }

      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn btn-pagination-arrow';
      nextBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
      nextBtn.type = 'button';
      if (currentPage === totalPages) nextBtn.disabled = true;
      nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
          currentPage++;
          renderTable();
        }
      });
      paginationControls.appendChild(nextBtn);
    }

    if (paginated.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">
        <div class="mb-3 fs-5">No reservations found for this status.</div>
        <a href="../../../features/hotels/search_results.html" class="btn btn-confirm-pay px-4 py-2" style="background-color: #1A0A2E; color: white; border-radius: 8px;">Book a Room</a>
      </td></tr>`;
      return;
    }

    paginated.forEach((b) => {
      // ── Compute lifecycle from real dates — never from stored b.status ──────
      const lc = HotelState.getBookingLifecycle(b);

      const badgeClass = lc.badgeClass;

      // ── Action buttons ───────────────────────────────────────────────────
      let actionHtml = `
        <button class="btn btn-action-view py-2 px-3 mb-2 d-inline-flex align-items-center justify-content-center gap-2 btn-view-details-flow" data-id="${b.id}">View Details <i class="bi bi-chevron-right"></i></button>
      `;

      if (lc.canModify) {
        // Fully allowed
        actionHtml += `
          <button class="btn btn-action-outline-modify py-2 px-3 mb-2 d-inline-flex align-items-center justify-content-center gap-2 btn-modify-flow" data-id="${b.id}">Modify Booking <i class="bi bi-pencil-square"></i></button>
        `;
      } else if (lc.stage === 'upcoming-locked') {
        // Within 24-h window — show locked state with tooltip
        actionHtml += `
          <button class="btn btn-action-outline-modify py-2 px-3 mb-2 d-inline-flex align-items-center justify-content-center gap-2"
                  disabled title="Modification locked — check-in is less than 24 hours away"
                  style="opacity:0.55; cursor:not-allowed;">
            <i class="bi bi-lock-fill me-1"></i> Modify Booking
          </button>
        `;
      }
      // 'active', 'completed', 'cancelled' — Modify button hidden entirely

      if (lc.canCancel) {
        actionHtml += `
          <button class="btn btn-action-outline-cancel py-2 px-3 mb-2 d-inline-flex align-items-center justify-content-center gap-2 btn-cancel-flow" data-id="${b.id}"><i class="bi bi-trash"></i> Cancel Booking</button>
        `;
      }
      // 'active', 'completed', 'cancelled' — Cancel button hidden entirely


      const formattedTotal = Number(b.grandTotal || b.amount?.replace(/,/g, '') || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

      tbody.innerHTML += `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-3">
              <img src="${b.image}" alt="Hotel image" class="row-hotel-img rounded" style="width: 60px; height: 60px; object-fit: cover;">
              <div class="ref-texts">
                <span class="booking-ref-number d-block text-dark fw-bold">${b.id}</span>
              </div>
            </div>
          </td>
          <td>
            <strong class="d-block text-dark">${b.branch}</strong>
            <span class="small text-muted">${b.hotelName}</span>
          </td>
          <td>
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-calendar-event text-warning fs-5"></i>
              <div>
                <span class="fw-semibold text-dark d-block">${b.checkIn}</span>
              </div>
            </div>
          </td>
          <td>
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-calendar-check text-warning fs-5"></i>
              <div>
                <span class="fw-semibold text-dark d-block">${b.checkOut}</span>
              </div>
            </div>
          </td>
          <td>
            <strong class="d-block text-dark font-serif fs-6">${formattedTotal}</strong>
          </td>
          <td class="text-center">
            <span class="${badgeClass}">${lc.displayStatus}</span>
          </td>
          <td class="text-end">
            <div class="d-flex flex-column align-items-end">
              ${actionHtml}
            </div>
          </td>
        </tr>
      `;
    });

    attachActionListeners();
  }



  let currentCancelId = null;
  const modalEl = document.getElementById('cancelConfirmModal');
  const cancelModal = modalEl ? new bootstrap.Modal(modalEl) : null;
  const btnFinalConfirm = document.getElementById('btnFinalConfirm');
  const btnProceedCancel = document.getElementById('btnProceedCancel');
  const cancelPanelReason = document.getElementById('cancelPanelReason');
  const cancelPanelConfirm = document.getElementById('cancelPanelConfirm');
  const cancelPanelSuccess = document.getElementById('cancelPanelSuccess');
  const cancelPanelLoading = document.getElementById('cancelPanelLoading');
  const btnSuccessClose = document.getElementById('btnSuccessClose');
  const btnCancelBack = document.getElementById('btnCancelBack');

  if (btnProceedCancel) {
    btnProceedCancel.addEventListener('click', () => {
       const select = document.getElementById('cancelReasonSelect');
       if (select && !select.value) {
         document.getElementById('cancelReasonErr').classList.remove('d-none');
         return;
       }
       document.getElementById('cancelReasonErr').classList.add('d-none');
       cancelPanelReason.classList.add('d-none');
       cancelPanelConfirm.classList.remove('d-none');
    });
  }

  if (btnCancelBack) {
    btnCancelBack.addEventListener('click', () => {
       cancelPanelConfirm.classList.add('d-none');
       cancelPanelReason.classList.remove('d-none');
    });
  }

  function attachActionListeners() {
    document.querySelectorAll('.btn-modify-flow').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bookingId = e.currentTarget.getAttribute('data-id');
        if (window.policyModal) {
          window.policyModal.show({
            title: 'Review Booking Modification Policy',
            policyType: 'modification',
            onContinue: () => {
              window.location.href = `../../bookings/modify_booking_step1.html?bookingId=${bookingId}`;
            }
          });
        } else {
          window.location.href = `../../bookings/modify_booking_step1.html?bookingId=${bookingId}`;
        }
      });
    });

    document.querySelectorAll('.btn-cancel-flow').forEach(btn => {
      btn.addEventListener('click', (e) => {
        currentCancelId = e.currentTarget.getAttribute('data-id');
        if (cancelModal) {
          if (cancelPanelReason) cancelPanelReason.classList.remove('d-none');
          if (cancelPanelConfirm) cancelPanelConfirm.classList.add('d-none');
          if (cancelPanelSuccess) cancelPanelSuccess.classList.add('d-none');
          if (cancelPanelLoading) cancelPanelLoading.classList.add('d-none');
          
          const sel = document.getElementById('cancelReasonSelect');
          if (sel) sel.value = '';
          const err = document.getElementById('cancelReasonErr');
          if (err) err.classList.add('d-none');
          
          cancelModal.show();
        }
      });
    });

    document.querySelectorAll('.btn-download-invoice').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        sessionStorage.setItem('invoiceBookingId', id);
        window.location.href = '../../../features/bookings/invoice_summary.html';
      });
    });

    // Populate and open Booking Details Modal
    const bookingDetailsModalEl = document.getElementById('bookingDetailsModal');
    if (bookingDetailsModalEl) {
      const detailsModal = new bootstrap.Modal(bookingDetailsModalEl);
      const detailsModalBody = document.getElementById('bookingDetailsModalBody');
      const btnDownloadTicket = document.getElementById('btnDownloadTicket');
      let currentDetailsBooking = null;

      document.querySelectorAll('.btn-view-details-flow').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          const b = HotelState.bookings.find(x => x.id === id);
          if (!b) return;

          currentDetailsBooking = b;

          const grandTotal = b.grandTotal || Number(b.amount?.replace(/,/g, '') || 0);
          const adultCount = b.guests || 1;
          const childCount = b.children || 0;
          const userObj = HotelState.getUserById(userId) || {};

          const pg = b.guestDetails?.primaryGuest || b.primaryGuest || {};

          if (detailsModalBody) {
            detailsModalBody.innerHTML = `
              <div class="row g-3">
                <div class="col-md-4 text-center">
                  <img src="${b.image || '../../assets/images/hotel_salem.png'}" alt="Hotel Face" class="img-fluid rounded border shadow-sm w-100" style="max-height: 180px; object-fit: cover;">
                </div>
                <div class="col-md-8">
                  <h5 class="fw-bold text-dark mb-1 font-serif fs-5">${b.hotelName || 'Elegant Enclave'}</h5>
                  <p class="text-muted mb-3"><i class="bi bi-geo-alt-fill text-warning me-1"></i>${b.branch || 'Branch'}</p>
                  <div class="row g-2">
                    <div class="col-6"><strong>Booking ID:</strong> <span class="text-purple fw-semibold">${b.id}</span></div>
                    <div class="col-6"><strong>Status:</strong> <span class="badge bg-primary text-white px-2 py-1 rounded" style="background-color: #1A0A2E !important;">${HotelState.getBookingLifecycle(b).displayStatus}</span></div>
                    <div class="col-6"><strong>Room ID:</strong> ${b.roomId}</div>
                    <div class="col-6"><strong>Room Type:</strong> ${b.roomType || 'Classic Suite'}</div>
                    <div class="col-6"><strong>Nights:</strong> ${b.nights || 1} Night(s)</div>
                  </div>
                </div>
              </div>

              <hr class="my-3">

              <div class="row g-3">
                <div class="col-md-6">
                  <h6 class="fw-bold text-dark border-bottom pb-1"><i class="bi bi-calendar3 text-warning me-2"></i>Stay Schedule</h6>
                  <div class="lh-sm">
                    <div class="py-1"><strong>Check-In:</strong> ${b.checkIn}</div>
                    <div class="py-1"><strong>Check-Out:</strong> ${b.checkOut}</div>
                    <div class="py-1"><strong>Guests:</strong> ${adultCount} Adult(s)${childCount > 0 ? ', ' + childCount + ' Child(ren)' : ''}</div>
                  </div>
                </div>
                <div class="col-md-6">
                  <h6 class="fw-bold text-dark border-bottom pb-1"><i class="bi bi-credit-card text-warning me-2"></i>Billing Specifications</h6>
                  <div class="lh-sm">
                    <div class="py-1"><strong>Payment Mode:</strong> ${b.paymentMethod || 'Debit / Credit Card'}</div>
                    <div class="py-1"><strong>Payment ID:</strong> ${b.transactionId || b.txnId || 'TXN' + (b.id?.split('-').pop() || Date.now())}</div>
                    <div class="py-1"><strong>Grand Total:</strong> ${grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</div>
                  </div>
                </div>
              </div>

              <hr class="my-3">

              <div class="row g-2">
                <div class="col-12">
                  <h6 class="fw-bold text-dark border-bottom pb-1"><i class="bi bi-person text-warning me-2"></i>Primary Guest Details</h6>
                  <div class="row g-2">
                    <div class="col-sm-6"><strong>Name:</strong> ${pg.name || (userObj.firstName ? (userObj.firstName + ' ' + userObj.lastName) : 'Customer')}</div>
                    <div class="col-sm-6"><strong>Email:</strong> ${pg.email || userObj.email || 'N/A'}</div>
                    <div class="col-sm-6"><strong>Phone:</strong> ${pg.phone || 'N/A'}</div>
                    <div class="col-sm-6"><strong>ID Proof:</strong> ${pg.idType || 'Aadhaar'} (${pg.idNumber || 'N/A'})</div>
                  </div>
                </div>
              </div>
            `;
          }

          detailsModal.show();
        });
      });

      if (btnDownloadTicket) {
        // Clone button to strip existing event listeners cleanly
        const newBtn = btnDownloadTicket.cloneNode(true);
        btnDownloadTicket.parentNode.replaceChild(newBtn, btnDownloadTicket);
        newBtn.addEventListener('click', () => {
          if (!currentDetailsBooking) return;
          const link = document.createElement('a');
          link.href = '../../../assets/images/Ticket.pdf';
          link.download = 'Ticket.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
      }
    }
  }

  if (btnFinalConfirm) {
    btnFinalConfirm.addEventListener('click', () => {
      if (!currentCancelId) return;

      const booking = HotelState.bookings.find(b => b.id === currentCancelId);
      if (!booking) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkInDate = new Date(booking.checkIn);
      // ── Use lifecycle for refund eligibility (centralised policy) ──────────
      const lifecycle = HotelState.getBookingLifecycle(booking);
      const isRefundable = lifecycle.isRefundable;

      const grandTotal = booking.grandTotal || Number(booking.amount?.replace(/,/g, '') || 0);
      const refundAmount = isRefundable ? Math.round(grandTotal * 0.90) : 0;
      const refundPercent = isRefundable ? '90%' : '0%';

      cancelPanelConfirm.classList.add('d-none');
      cancelPanelLoading.classList.remove('d-none');
      
      setTimeout(() => {
         cancelPanelLoading.classList.add('d-none');
         cancelPanelSuccess.classList.remove('d-none');

         const updatedBooking = HotelState.updateBooking(currentCancelId, {
            status: 'Cancelled',
            bookingStatus: 'Cancelled',
            cancellationDate: new Date().toISOString(),
            refundStatus: isRefundable ? 'Pending' : 'Non-Refundable',
            refundAmount: refundAmount,
            refundMethod: booking.paymentMethod || 'Debit / Credit Card',
            refundInitiatedDate: new Date().toISOString()
         });

         if (updatedBooking && updatedBooking.roomId) {
            HotelState.updateRoomStatus(updatedBooking.roomId, 'Available');
         }

         // Populate success dialog card fields dynamically
         const successMsgEl = document.getElementById('cancelSuccessMsg');
         if (successMsgEl) {
           successMsgEl.innerHTML = isRefundable 
             ? `Your booking has been cancelled successfully.<br>The eligible refund of 90% (₹${refundAmount.toLocaleString('en-IN')}) will be credited to your original payment method within 3–5 business days.`
             : `Booking cancelled successfully. This booking is not eligible for a refund according to the cancellation policy.`;
         }

         document.getElementById('cancelSuccessRef').textContent = currentCancelId;
         document.getElementById('cancelSuccessOriginal').textContent = `₹${grandTotal.toLocaleString('en-IN')}`;
         document.getElementById('cancelSuccessPercent').textContent = refundPercent;
         document.getElementById('cancelSuccessAmount').textContent = `₹${refundAmount.toLocaleString('en-IN')}`;
         document.getElementById('cancelSuccessMethod').textContent = booking.paymentMethod || 'Debit / Credit Card';
         
         const statusBadge = document.getElementById('cancelSuccessStatus');
         if (statusBadge) {
           statusBadge.textContent = isRefundable ? 'Pending' : 'Non-Refundable';
           statusBadge.className = isRefundable ? 'badge bg-success text-white' : 'badge bg-danger text-white';
         }

         const userObj = HotelState.getUserById(userId);
         const userName = userObj ? `${userObj.firstName} ${userObj.lastName}` : 'Customer';

         

         const mockNotifs = HotelState.notifications;
         mockNotifs.unshift({
           id: 'NOTIF' + Date.now(),
           recipientId: userId,
           recipientRole: 'Customer',
           type: 'Cancellation',
           title: 'Booking Cancelled',
           message: `Your reservation ${currentCancelId} has been cancelled successfully. Refund: ₹${refundAmount}`,
           isRead: false,
           createdAt: new Date().toISOString(),
           relatedId: currentCancelId
         });
         HotelState.notifications = mockNotifs;

         allBookings = HotelState.getBookingsByCustomer(userId);
         renderTable();
      }, 1000);
    });
  }

  // Filters & Search
  const searchInput = document.getElementById('tableSearchInput');
  const statusFilter = document.getElementById('statusFilter');
  const branchFilter = document.getElementById('branchFilter');
  const btnApply = document.getElementById('btnApplyTableFilters');
  const btnReset = document.getElementById('btnResetTableFilters');

  function applyActiveFilters() {
    const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const statusVal = statusFilter ? statusFilter.value : 'all';
    const branchVal = branchFilter ? branchFilter.value : 'all';

    // 1. Filter by Status
    if (statusVal === 'all') {
      currentFilter = 'All';
    } else {
      currentFilter = statusVal;
    }

    // 2. Filter bookings by search query and branch
    let bkgs = HotelState.getBookingsByCustomer(userId);

    if (branchVal !== 'all') {
      bkgs = bkgs.filter(b => b.branch === branchVal);
    }

    if (q) {
      bkgs = bkgs.filter(b => 
        b.id.toLowerCase().includes(q) || 
        (b.hotelName && b.hotelName.toLowerCase().includes(q)) || 
        (b.branch && b.branch.toLowerCase().includes(q))
      );
    }

    allBookings = bkgs;
    renderTable();
  }

  if (btnApply) {
    btnApply.addEventListener('click', applyActiveFilters);
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (statusFilter) statusFilter.value = 'all';
      if (branchFilter) branchFilter.value = 'all';
      currentFilter = 'All';
      allBookings = HotelState.getBookingsByCustomer(userId);
      renderTable();
    });
  }

  const rowsSelect = document.getElementById('rowsPerPageSelect');
  if (rowsSelect) {
    rowsSelect.addEventListener('change', (e) => {
      rowsPerPage = parseInt(e.target.value);
      currentPage = 1;
      renderTable();
    });
  }

  renderTable();
});
