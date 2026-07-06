document.addEventListener('DOMContentLoaded', () => {
  // 1. Mock Booking Database
  let bookings = [
    { id: 'EE-2026-9841', guest: 'Arjun Mehta', email: 'arjun@email.com', phone: '+91 98765 43210', room: '304', type: 'Deluxe Suite', branch: 'Elegant Enclave Chennai', guests: 2, checkin: '2026-07-03', checkout: '2026-07-06', amount: 23010, payment: 'Paid', status: 'Confirmed', notes: 'Prefers high floor' },
    { id: 'EE-2026-8911', guest: 'Sarah Jenkins', email: 'sarah@email.com', phone: '+91 98765 43211', room: '201', type: 'Executive Studio', branch: 'Elegant Enclave Chennai', guests: 2, checkin: '2026-07-02', checkout: '2026-07-05', amount: 27500, payment: 'Pending', status: 'Confirmed', notes: 'Anniversary celebration' },
    { id: 'EE-2026-9042', guest: 'Ramesh Krishnan', email: 'ramesh@email.com', phone: '+91 98765 43212', room: '108', type: 'Standard Room', branch: 'Elegant Enclave Chennai', guests: 1, checkin: '2026-07-02', checkout: '2026-07-04', amount: 12000, payment: 'Paid', status: 'Checked In', notes: 'Early check-in request' },
    { id: 'EE-2026-9730', guest: 'Priya Sharma', email: 'priya@email.com', phone: '+91 98765 43213', room: '501', type: 'Penthouse Suite', branch: 'Elegant Enclave Chennai', guests: 4, checkin: '2026-07-03', checkout: '2026-07-07', amount: 45000, payment: 'Paid', status: 'Confirmed', notes: 'Late checkout requested' },
    { id: 'EE-2026-9812', guest: 'Amit Patel', email: 'amit@email.com', phone: '+91 98765 43214', room: '302', type: 'Deluxe Suite', branch: 'Elegant Enclave Chennai', guests: 3, checkin: '2026-07-02', checkout: '2026-07-05', amount: 29000, payment: 'Paid', status: 'Checked In', notes: 'Extra bed required' },
    { id: 'EE-2026-7811', guest: 'Divya Nair', email: 'divya@email.com', phone: '+91 98765 43215', room: '102', type: 'Standard Room', branch: 'Elegant Enclave Chennai', guests: 1, checkin: '2026-06-30', checkout: '2026-07-02', amount: 8000, payment: 'Refunded', status: 'Cancelled', notes: 'Change of travel plans' },
    { id: 'EE-2026-9400', guest: 'Sridhar Kumar', email: 'sridhar@email.com', phone: '+91 98765 43216', room: '204', type: 'Executive Studio', branch: 'Elegant Enclave Chennai', guests: 2, checkin: '2026-06-28', checkout: '2026-07-02', amount: 16000, payment: 'Paid', status: 'Checked In', notes: 'Frequent guest' },
    { id: 'EE-2026-9102', guest: 'Srinivas Murthy', email: 'srinivas@email.com', phone: '+91 98765 43217', room: '311', type: 'Deluxe Suite', branch: 'Elegant Enclave Chennai', guests: 2, checkin: '2026-06-25', checkout: '2026-07-02', amount: 35000, payment: 'Paid', status: 'Checked Out', notes: 'Business traveler' }
  ];

  // 2. Selectors
  const tblBody = document.querySelector('#tblAllBookings tbody');
  const txtSearch = document.getElementById('txtSearch');
  const selBranch = document.getElementById('selBranch');
  const selRoomType = document.getElementById('selRoomType');
  const selStatus = document.getElementById('selStatus');
  const btnReset = document.getElementById('btnResetFilters');
  const btnExport = document.getElementById('btnExportCSV');
  const skeleton = document.getElementById('skeletonLoading');
  const tableContainer = document.getElementById('tableContainer');
  const emptyState = document.getElementById('emptyState');
  const lblPageCount = document.getElementById('lblPageCount');
  const paginationControls = document.getElementById('paginationControls');

  const detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
  const detailModalBody = document.getElementById('detailModalBody');
  const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
  const confirmModalText = document.getElementById('confirmModalText');
  const btnConfirmAction = document.getElementById('btnConfirmAction');

  let activeConfirmAction = null;
  let currentPage = 1;
  let pageSize = 10;

  // Initialize tooltips
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(el => new bootstrap.Tooltip(el));

  function updateKpis() {
    document.getElementById('kpiTotal').textContent = bookings.length;
    document.getElementById('kpiCheckins').textContent = bookings.filter(b => b.status === 'Confirmed' && b.checkin === '2026-07-02').length;
    document.getElementById('kpiCheckouts').textContent = bookings.filter(b => b.status === 'Checked In' && b.checkout === '2026-07-02').length;
    document.getElementById('kpiPending').textContent = bookings.filter(b => b.status === 'Pending').length;
    document.getElementById('kpiCancelled').textContent = bookings.filter(b => b.status === 'Cancelled').length;
  }

  function showToast(message, isSuccess = true) {
    const toastMessage = document.getElementById('toastMessage');
    const toastEl = document.getElementById('statusToast');
    toastEl.className = `toast align-items-center text-white border-0 shadow ${isSuccess ? 'bg-success' : 'bg-danger'}`;
    toastMessage.textContent = message;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }

  function renderTable() {
    skeleton.classList.remove('d-none');
    tableContainer.classList.add('d-none');
    emptyState.classList.add('d-none');

    setTimeout(() => {
      tblBody.innerHTML = '';
      const query = txtSearch.value.toLowerCase().trim();
      const branchVal = selBranch.value;
      const roomVal = selRoomType.value;
      const statusVal = selStatus.value;

      let filtered = bookings.filter(b => {
        if (query && !b.id.toLowerCase().includes(query) && !b.guest.toLowerCase().includes(query) && !b.phone.includes(query)) return false;
        if (branchVal !== 'all' && !b.branch.includes(branchVal)) return false;
        if (roomVal !== 'all' && b.type !== roomVal) return false;
        if (statusVal !== 'all' && b.status !== statusVal) return false;
        return true;
      });

      skeleton.classList.add('d-none');

      if (filtered.length === 0) {
        emptyState.classList.remove('d-none');
        paginationControls.innerHTML = '';
        lblPageCount.textContent = 'Showing 0 to 0 of 0 bookings';
        return;
      }

      tableContainer.classList.remove('d-none');

      // Pagination
      const totalPages = Math.ceil(filtered.length / pageSize);
      if (currentPage > totalPages) currentPage = totalPages;
      const startIdx = (currentPage - 1) * pageSize;
      const pageItems = filtered.slice(startIdx, startIdx + pageSize);

      lblPageCount.textContent = `Showing ${startIdx + 1} to ${Math.min(startIdx + pageSize, filtered.length)} of ${filtered.length} bookings`;

      pageItems.forEach(b => {
        const isCancelled = b.status === 'Cancelled';
        const isCompleted = b.status === 'Checked Out';
        const isConfirmed = b.status === 'Confirmed';
        const isCheckedIn = b.status === 'Checked In';

        let statusClass = 'bg-secondary';
        if (b.status === 'Confirmed') statusClass = 'bg-success text-white';
        else if (b.status === 'Pending') statusClass = 'bg-warning text-dark';
        else if (b.status === 'Checked In') statusClass = 'bg-info text-dark';
        else if (b.status === 'Cancelled') statusClass = 'bg-danger text-white';

        let paymentClass = b.payment === 'Paid' ? 'bg-success text-white' : 'bg-warning text-dark';

        // Action controls depending on status
        let buttons = `<button class="btn btn-outline-purple btn-sm py-0 px-2 me-1" onclick="viewDetail('${b.id}')">View</button>`;
        if (!isCancelled && !isCompleted) {
          buttons += `<button class="btn btn-outline-purple btn-sm py-0 px-2 me-1" onclick="modifyBooking('${b.id}')">Modify</button>`;
          buttons += `<button class="btn btn-outline-danger btn-sm py-0 px-2 me-1" onclick="confirmCancel('${b.id}')">Cancel</button>`;
        }
        if (isConfirmed) {
          buttons += `<button class="btn btn-success btn-sm py-0 px-2 me-1" onclick="confirmCheckin('${b.id}')">Check-in</button>`;
        }
        if (isCheckedIn) {
          buttons += `<button class="btn btn-danger btn-sm py-0 px-2 me-1" onclick="confirmCheckout('${b.id}')">Check-out</button>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${b.id}</strong></td>
          <td>${b.guest}</td>
          <td>Room ${b.room} <span class="text-muted d-block small" style="font-size: 0.65rem;">${b.type}</span></td>
          <td>${b.branch}</td>
          <td>${b.guests}</td>
          <td>${b.checkin}</td>
          <td>${b.checkout}</td>
          <td><span class="badge ${statusClass} badge-status">${b.status}</span></td>
          <td><span class="badge ${paymentClass} badge-payment">${b.payment}</span></td>
          <td class="text-end fw-bold">₹${b.amount.toLocaleString('en-IN')}</td>
          <td class="text-end text-nowrap">${buttons}</td>
        `;
        tblBody.appendChild(tr);
      });

      renderPagination(totalPages);
    }, 300);
  }

  function renderPagination(totalPages) {
    paginationControls.innerHTML = '';
    if (totalPages <= 1) return;

    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#">Previous</a>`;
    prevLi.onclick = (e) => { e.preventDefault(); if (currentPage > 1) { currentPage--; renderTable(); } };
    paginationControls.appendChild(prevLi);

    for (let i = 1; i <= totalPages; i++) {
      const pageLi = document.createElement('li');
      pageLi.className = `page-item ${currentPage === i ? 'active' : ''}`;
      pageLi.innerHTML = `<a class="page-link" href="#">${i}</a>`;
      pageLi.onclick = (e) => { e.preventDefault(); currentPage = i; renderTable(); };
      paginationControls.appendChild(pageLi);
    }

    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#">Next</a>`;
    nextLi.onclick = (e) => { e.preventDefault(); if (currentPage < totalPages) { currentPage++; renderTable(); } };
    paginationControls.appendChild(nextLi);
  }

  window.viewDetail = function(id) {
    const b = bookings.find(x => x.id === id);
    if (!b) return;

    detailModalBody.innerHTML = `
      <div class="row g-3 text-start small">
        <div class="col-md-6">
          <p class="mb-1 text-secondary">Booking ID</p>
          <strong class="text-dark fs-5">${b.id}</strong>
        </div>
        <div class="col-md-6">
          <p class="mb-1 text-secondary">Branch</p>
          <strong class="text-dark">${b.branch}</strong>
        </div>
        <div class="col-md-6">
          <p class="mb-1 text-secondary">Guest Name</p>
          <strong class="text-dark">${b.guest}</strong>
        </div>
        <div class="col-md-6">
          <p class="mb-1 text-secondary">Contact Info</p>
          <span class="text-dark">${b.email} | ${b.phone}</span>
        </div>
        <hr class="my-2 bg-secondary opacity-25">
        <div class="col-md-6">
          <p class="mb-1 text-secondary">Room Details</p>
          <strong class="text-dark">Room ${b.room} (${b.type})</strong>
        </div>
        <div class="col-md-6">
          <p class="mb-1 text-secondary">Total Stay</p>
          <strong class="text-dark">${b.checkin} to ${b.checkout}</strong>
        </div>
        <div class="col-md-6">
          <p class="mb-1 text-secondary">Current Status</p>
          <span class="badge bg-secondary">${b.status}</span>
        </div>
        <div class="col-md-6">
          <p class="mb-1 text-secondary">Payment & Amount</p>
          <strong class="text-dark">₹${b.amount.toLocaleString()} (${b.payment})</strong>
        </div>
      </div>
    `;
    detailModal.show();
  };

  window.modifyBooking = function(id) {
    // Navigate to modify sub-step or display information toast
    showToast(`Redirecting to modification workflow for ${id}...`);
  };

  window.confirmCancel = function(id) {
    confirmModalText.textContent = `Are you sure you want to cancel booking ${id}? This action will release the reserved slot and initiate cancellation policies.`;
    activeConfirmAction = () => {
      const b = bookings.find(x => x.id === id);
      if (b) {
        b.status = 'Cancelled';
        b.payment = 'Refund Pending';
        showToast(`Booking ${id} cancelled successfully.`);
        renderTable();
        updateKpis();
      }
    };
    confirmModal.show();
  };

  window.confirmCheckin = function(id) {
    confirmModalText.textContent = `Do you want to process Check-in for booking ${id}? Confirm guest identification documents are verified.`;
    activeConfirmAction = () => {
      const b = bookings.find(x => x.id === id);
      if (b) {
        b.status = 'Checked In';
        showToast(`Guest checked in successfully.`);
        renderTable();
        updateKpis();
      }
    };
    confirmModal.show();
  };

  window.confirmCheckout = function(id) {
    confirmModalText.textContent = `Do you want to finalize Check-out for booking ${id}? Ensure any extra service, minibar, or damage charges are fully collected.`;
    activeConfirmAction = () => {
      const b = bookings.find(x => x.id === id);
      if (b) {
        b.status = 'Checked Out';
        showToast(`Check-out completed. Final receipts sent to email.`);
        renderTable();
        updateKpis();
      }
    };
    confirmModal.show();
  };

  btnConfirmAction.addEventListener('click', () => {
    if (activeConfirmAction) {
      activeConfirmAction();
      confirmModal.hide();
    }
  });

  // Bind filter events
  txtSearch.addEventListener('input', renderTable);
  selBranch.addEventListener('change', renderTable);
  selRoomType.addEventListener('change', renderTable);
  selStatus.addEventListener('change', renderTable);
  
  btnReset.addEventListener('click', () => {
    txtSearch.value = '';
    selBranch.value = 'all';
    selRoomType.value = 'all';
    selStatus.value = 'all';
    currentPage = 1;
    renderTable();
  });

  document.getElementById('btnRefreshList').addEventListener('click', renderTable);

  btnExport.addEventListener('click', () => {
    showToast("Booking data logs exported successfully.");
  });

  // Initial runs
  updateKpis();
  renderTable();
});
