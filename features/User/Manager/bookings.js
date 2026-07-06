document.addEventListener('DOMContentLoaded', () => {
  // 1. Mock Booking Database
  let bookings = [
    { id: 'HBS-2026-001', guest: 'Rajesh K.', email: 'rajesh@email.com', phone: '+91 98765 43210', room: 'Exec Studio 201', type: 'Executive Studio', checkin: '2026-06-25', checkout: '2026-06-28', guests: '2 Adults', amount: 23010, payment: 'Paid', status: 'Checked In', notes: 'Prefers high floor', idType: 'Aadhaar Card' },
    { id: 'HBS-2026-002', guest: 'Priya S.', email: 'priya@email.com', phone: '+91 98765 43211', room: 'Deluxe Suite 305', type: 'Deluxe Suite', checkin: '2026-06-26', checkout: '2026-06-29', guests: '2 Adults', amount: 27500, payment: 'Pending', status: 'Pending', notes: 'Anniversary celebration', idType: '' },
    { id: 'HBS-2026-003', guest: 'Arun M.', email: 'arun@email.com', phone: '+91 98765 43212', room: 'Standard 108', type: 'Standard Room', checkin: '2026-06-27', checkout: '2026-06-30', guests: '1 Adult', amount: 12000, payment: 'Paid', status: 'Checked Out', notes: 'Early check-in request', idType: 'Driving License' },
    { id: 'HBS-2026-004', guest: 'Meena V.', email: 'meena@email.com', phone: '+91 98765 43213', room: 'Penthouse 501', type: 'Penthouse Suite', checkin: '2026-06-28', checkout: '2026-07-02', guests: '4 Adults', amount: 45000, payment: 'Paid', status: 'Confirmed', notes: 'Late checkout requested', idType: 'Passport' },
    { id: 'HBS-2026-005', guest: 'Suresh P.', email: 'suresh@email.com', phone: '+91 98765 43214', room: 'Deluxe Suite 302', type: 'Deluxe Suite', checkin: '2026-06-29', checkout: '2026-07-03', guests: '3 Guests', amount: 29000, payment: 'Pending', status: 'Pending', notes: 'Extra bed required', idType: '' },
    { id: 'HBS-2026-006', guest: 'Kavya R.', email: 'kavya@email.com', phone: '+91 98765 43215', room: 'Standard 102', type: 'Standard Room', checkin: '2026-06-30', checkout: '2026-07-02', guests: '1 Guest', amount: 8000, payment: 'Refund Pending', status: 'Cancelled', notes: 'Change of travel plans', idType: '' }
  ];

  const tblBody = document.querySelector('#tblAllBookings tbody');
  const searchInput = document.getElementById('filterSearch');
  const statusSelect = document.getElementById('filterStatus');
  const roomSelect = document.getElementById('filterRoom');
  const dateInput = document.getElementById('filterDate');
  const btnReset = document.getElementById('btnResetFilters');
  const btnEmptyReset = document.getElementById('btnEmptyReset');
  const tableEmptyState = document.getElementById('emptyState');
  const tblElement = document.querySelector('#tblAllBookings');

  // Load URL Query parameters if present (filtering options)
  const urlParams = new URLSearchParams(window.location.search);
  const filterParam = urlParams.get('filter');

  if (filterParam) {
    if (filterParam === 'pending') statusSelect.value = 'pending';
    else if (filterParam === 'modified') statusSelect.value = 'confirmed';
    else if (filterParam === 'cancelled') statusSelect.value = 'cancelled';
  }

  // Modals
  const detailModal = new bootstrap.Modal(document.getElementById('bookingDetailModal'));
  const actionModal = new bootstrap.Modal(document.getElementById('bookingActionModal'));

  function renderTable() {
    tblBody.innerHTML = '';
    const query = searchInput.value.toLowerCase().trim();
    const selectedStatus = statusSelect.value;
    const selectedRoom = roomSelect.value;
    const selectedDate = dateInput.value;

    let renderedCount = 0;

    bookings.forEach(b => {
      // Filtering rules
      if (query && !b.guest.toLowerCase().includes(query) && !b.id.toLowerCase().includes(query)) return;
      
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'pending' && b.status.toLowerCase() !== 'pending') return;
        if (selectedStatus === 'confirmed' && b.status.toLowerCase() !== 'confirmed') return;
        if (selectedStatus === 'checked-in' && b.status.toLowerCase() !== 'checked in') return;
        if (selectedStatus === 'checked-out' && b.status.toLowerCase() !== 'checked out') return;
        if (selectedStatus === 'cancelled' && b.status.toLowerCase() !== 'cancelled') return;
      }
      
      if (selectedRoom !== 'all' && !b.type.toLowerCase().includes(selectedRoom.toLowerCase())) return;
      if (selectedDate && b.checkin !== selectedDate && b.checkout !== selectedDate) return;

      renderedCount++;

      // Badges
      let statusBadge = '';
      if (b.status === 'Pending') statusBadge = '<span class="badge bg-warning-light text-warning rounded-pill px-3 py-1">Pending</span>';
      else if (b.status === 'Confirmed') statusBadge = '<span class="badge bg-success-light text-success rounded-pill px-3 py-1">Confirmed</span>';
      else if (b.status === 'Checked In') statusBadge = '<span class="badge bg-info-light text-info rounded-pill px-3 py-1">Checked In</span>';
      else if (b.status === 'Checked Out') statusBadge = '<span class="badge bg-secondary-light text-secondary rounded-pill px-3 py-1">Checked Out</span>';
      else if (b.status === 'Cancelled') statusBadge = '<span class="badge bg-danger-light text-danger rounded-pill px-3 py-1">Cancelled</span>';
      else statusBadge = `<span class="badge bg-dark text-white rounded-pill px-3 py-1">${b.status}</span>`;

      let paymentBadge = b.payment === 'Paid' ? '<span class="badge bg-success-light text-success rounded-pill px-3 py-1">Paid</span>' : '<span class="badge bg-warning-light text-warning rounded-pill px-3 py-1">Pending</span>';

      // Actions Column Stack
      let actionButtons = `<button class="btn btn-sm btn-outline-primary me-1 btn-detail-view" data-id="${b.id}">View</button>`;
      
      if (b.status === 'Pending') {
        actionButtons += `<button class="btn btn-sm btn-success me-1 btn-action-approve" data-id="${b.id}">Approve</button>`;
      } else if (b.status === 'Confirmed') {
        actionButtons += `<button class="btn btn-sm btn-warning me-1 btn-action-checkin" data-id="${b.id}">Check-in</button>`;
      } else if (b.status === 'Checked In') {
        actionButtons += `<button class="btn btn-sm btn-danger me-1 btn-action-checkout" data-id="${b.id}">Check-out</button>`;
      }

      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${b.id}</strong></td>
        <td>${b.guest}</td>
        <td>${b.room}</td>
        <td>Chennai Enclave</td>
        <td>${b.guests}</td>
        <td>${b.checkin}</td>
        <td>${b.checkout}</td>
        <td>${statusBadge}</td>
        <td>${paymentBadge}</td>
        <td class="text-end">₹${b.amount.toLocaleString()}</td>
        <td class="text-end text-nowrap">${actionButtons}</td>
      `;
      tblBody.appendChild(row);
    });

    // Handle empty state rendering
    if (renderedCount === 0) {
      if (tableEmptyState) tableEmptyState.classList.remove('d-none');
      if (tblElement) tblElement.classList.add('d-none');
    } else {
      if (tableEmptyState) tableEmptyState.classList.add('d-none');
      if (tblElement) tblElement.classList.remove('d-none');
    }

    const lblPaginationCount = document.getElementById('lblPageCount');
    if (lblPaginationCount) {
      lblPaginationCount.textContent = `Showing 1 to ${renderedCount} of ${bookings.length} bookings`;
    }

    bindActions();
  }

  function bindActions() {
    // 1. Details view modal
    document.querySelectorAll('.btn-detail-view').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const b = bookings.find(x => x.id === id);
        
        const content = document.getElementById('detailModalContent');
        content.innerHTML = `
          <div class="row g-3">
            <div class="col-md-6">
              <h5 class="text-warning font-serif border-bottom pb-2">Guest Profile</h5>
              <p class="mb-1"><strong>Name:</strong> ${b.guest}</p>
              <p class="mb-1"><strong>Email:</strong> ${b.email}</p>
              <p class="mb-1"><strong>Phone:</strong> ${b.phone}</p>
              <p class="mb-1"><strong>ID Verified:</strong> ${b.idType || 'Not Provided'}</p>
            </div>
            <div class="col-md-6">
              <h5 class="text-warning font-serif border-bottom pb-2">Stay Info</h5>
              <p class="mb-1"><strong>Room Type:</strong> ${b.type}</p>
              <p class="mb-1"><strong>Room Assigned:</strong> ${b.room}</p>
              <p class="mb-1"><strong>Stay Range:</strong> ${b.checkin} to ${b.checkout}</p>
              <p class="mb-1"><strong>Occupancy:</strong> ${b.guests}</p>
            </div>
            <div class="col-md-12 mt-3">
              <h5 class="text-warning font-serif border-bottom pb-2">Billing Details</h5>
              <p class="mb-1"><strong>Total Amount Charged:</strong> ₹${b.amount.toLocaleString()}</p>
              <p class="mb-1"><strong>Payment Status:</strong> ${b.payment}</p>
              <p class="mb-1"><strong>Manager Notes:</strong> ${b.notes || 'None'}</p>
            </div>
          </div>
          <div class="mt-4 pt-3 border-top d-flex justify-content-end gap-2">
            ${b.status === 'Pending' ? `<button class="btn btn-success px-4" id="btnDetailApprove">Approve Stay</button>
            <button class="btn btn-danger px-4" id="btnDetailReject">Reject Stay</button>` : ''}
            <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        `;

        if (b.status === 'Pending') {
          document.getElementById('btnDetailApprove').addEventListener('click', () => {
            b.status = 'Confirmed';
            b.payment = 'Paid';
            detailModal.hide();
            renderTable();
          });
          document.getElementById('btnDetailReject').addEventListener('click', () => {
            b.status = 'Cancelled';
            detailModal.hide();
            renderTable();
          });
        }

        detailModal.show();
      });
    });

    // 2. Direct Table Action: Approve Stay
    document.querySelectorAll('.btn-action-approve').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const b = bookings.find(x => x.id === id);
        
        const content = document.getElementById('actionModalContent');
        content.innerHTML = `
          <p>Are you sure you want to approve the stay request for guest <strong>${b.guest}</strong> (${b.id})?</p>
          <div class="mt-4 d-flex justify-content-end gap-2">
            <button class="btn btn-success" id="btnConfirmApprove">Confirm Approval</button>
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          </div>
        `;

        document.getElementById('btnConfirmApprove').addEventListener('click', () => {
          b.status = 'Confirmed';
          b.payment = 'Paid';
          actionModal.hide();
          renderTable();
        });

        actionModal.show();
      });
    });

    // 3. Direct Table Action: Check-in console
    document.querySelectorAll('.btn-action-checkin').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const b = bookings.find(x => x.id === id);

        const content = document.getElementById('actionModalContent');
        content.innerHTML = `
          <h5 class="text-warning font-serif mb-3">Front Desk Check-in Console</h5>
          <div class="mb-3">
            <label class="form-label small fw-bold">Select Government ID Type</label>
            <select id="checkinIdType" class="form-select">
              <option value="Aadhaar Card">Aadhaar Card</option>
              <option value="Passport">Passport</option>
              <option value="Driving License">Driving License</option>
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label small fw-bold">Government ID Number / Verification Code</label>
            <input type="text" id="checkinIdNum" class="form-control" placeholder="Enter ID details" required>
          </div>
          <div class="mb-3">
            <label class="form-label small fw-bold">Assign Room Key Code</label>
            <input type="text" id="checkinKey" class="form-control" value="KEY-201-EE" required>
          </div>

          <div class="mt-4 d-flex justify-content-end gap-2">
            <button class="btn btn-success" id="btnConfirmCheckin">Complete Check-in</button>
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          </div>
        `;

        document.getElementById('btnConfirmCheckin').addEventListener('click', () => {
          const idVal = document.getElementById('checkinIdType').value;
          b.idType = idVal;
          b.status = 'Checked In';
          actionModal.hide();
          renderTable();
        });

        actionModal.show();
      });
    });

    // 4. Direct Table Action: Check-out console
    document.querySelectorAll('.btn-action-checkout').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const b = bookings.find(x => x.id === id);

        const content = document.getElementById('actionModalContent');
        content.innerHTML = `
          <h5 class="text-warning font-serif mb-3">Front Desk Check-out Console</h5>
          <p>Review Billing Details for room checkout.</p>
          <div class="p-3 bg-light rounded mb-3 border">
            <div class="d-flex justify-content-between mb-1">
              <span>Base Stay Charge</span>
              <strong>₹${(b.amount - 1200).toLocaleString()}</strong>
            </div>
            <div class="d-flex justify-content-between mb-1">
              <span>Mini Bar charges</span>
              <strong>₹500</strong>
            </div>
            <div class="d-flex justify-content-between mb-1">
              <span>Extra Laundry charges</span>
              <strong>₹700</strong>
            </div>
            <div class="d-flex justify-content-between border-top pt-2">
              <strong>Final Bill Amount</strong>
              <strong class="text-warning">₹${b.amount.toLocaleString()}</strong>
            </div>
          </div>

          <div class="mt-4 d-flex justify-content-end gap-2">
            <button class="btn btn-danger" id="btnConfirmCheckout">Complete Check-out</button>
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          </div>
        `;

        document.getElementById('btnConfirmCheckout').addEventListener('click', () => {
          b.status = 'Checked Out';
          actionModal.hide();
          renderTable();
        });

        actionModal.show();
      });
    });
  }

  function resetAllFilters() {
    if (searchInput) searchInput.value = '';
    if (statusSelect) statusSelect.value = 'all';
    if (roomSelect) roomSelect.value = 'all';
    if (dateInput) dateInput.value = '';
    renderTable();
  }

  // Setup live filtering search hooks
  if (searchInput) searchInput.addEventListener('input', renderTable);
  if (statusSelect) statusSelect.addEventListener('change', renderTable);
  if (roomSelect) roomSelect.addEventListener('change', renderTable);
  if (dateInput) dateInput.addEventListener('change', renderTable);

  if (btnReset) btnReset.addEventListener('click', resetAllFilters);
  if (btnEmptyReset) btnEmptyReset.addEventListener('click', resetAllFilters);

  // Initial table load
  renderTable();
});
