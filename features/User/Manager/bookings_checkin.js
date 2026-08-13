const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');
const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

if (!isLoggedIn || userRole !== 'Manager') {
  window.location.href = '../../../features/Auth/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const managerUser = HotelState.users.find(u => u.id === userId);
  const hotelId = managerUser?.assignedHotelId;
  const hotel = HotelState.hotels.find(h => h.id === hotelId);

  if (!hotel) {
    console.error("Manager has no assigned hotel!");
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  let checkinBookings = [];
  let pendingArrivalsCount = 0;
  let lateArrivalsCount = 0;
  let checkedInCount = 0;
  let totalArrivalsCount = 0;

  // Pagination state
  let currentPage = 1;
  const itemsPerPage = 5;
  let filteredBookings = [];

  // Filter state
  let currentSearch = '';
  let currentRoom = '';
  let currentBranch = 'all';

  function loadCheckins() {
    // Generate Sample Data matching screenshot exactly
    checkinBookings = [
      {
        id: 'EE-SAL-260101-1234',
        email: 'undefined undefined',
        guestDetails: { primaryGuest: { firstName: 'undefined', lastName: 'undefined' } },
        roomId: 'RM002',
        checkIn: '15 Jul 2026',
        adultsCount: 2, childrenCount: 0,
        bookingStatus: 'Confirmed',
        hotelId: 'SAL' // Salem
      },
      {
        id: 'EE-SIM-7267-15',
        email: 'user15@test.com',
        roomId: 'RM004',
        checkIn: '16 Jul 2026',
        adultsCount: 0, childrenCount: 0,
        bookingStatus: 'Confirmed',
        hotelId: 'SIM' // Coimbatore
      },
      {
        id: 'EE-SIM-7267-30',
        email: 'user30@test.com',
        roomId: 'RM001',
        checkIn: '03 Jul 2026',
        adultsCount: 0, childrenCount: 0,
        bookingStatus: 'Confirmed',
        hotelId: 'SIM' // Coimbatore
      }
    ];

    // Fixed KPI Stats as requested
    totalArrivalsCount = 0;
    checkedInCount = 0;
    pendingArrivalsCount = 0;
    lateArrivalsCount = 3;

    renderKPIs();
    applyFilters();
  }

  function applyFilters() {
    filteredBookings = checkinBookings.filter(b => {
      let match = true;
      const guestName = (b.guestDetails && b.guestDetails.primaryGuest) ? `${b.guestDetails.primaryGuest.firstName} ${b.guestDetails.primaryGuest.lastName}` : b.email;
      
      if (currentSearch && !b.id.toLowerCase().includes(currentSearch) && !guestName.toLowerCase().includes(currentSearch)) {
        match = false;
      }
      if (currentRoom && !b.roomId.toLowerCase().includes(currentRoom)) {
        match = false;
      }
      if (currentBranch !== 'all') {
        const branchMatch = (currentBranch === 'Salem' && b.hotelId === 'SAL') || (currentBranch === 'Coimbatore' && b.hotelId === 'SIM') || (currentBranch === 'Chennai' && b.hotelId === 'CHE');
        if (!branchMatch) match = false;
      }
      return match;
    });

    currentPage = 1;
    renderTable();
  }

  function renderKPIs() {
    const kpiArrivals = document.getElementById('kpiArrivals');
    const kpiCheckedin = document.getElementById('kpiCheckedin');
    const kpiPending = document.getElementById('kpiPending');
    const kpiLate = document.getElementById('kpiLate');

    if (kpiArrivals) kpiArrivals.textContent = totalArrivalsCount;
    if (kpiCheckedin) kpiCheckedin.textContent = checkedInCount;
    if (kpiPending) kpiPending.textContent = pendingArrivalsCount;
    if (kpiLate) kpiLate.textContent = lateArrivalsCount;
  }

  function renderTable() {
    const tbody = document.querySelector('#tblCheckin tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (filteredBookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No records found matching filters.</td></tr>`;
      updatePagination(0, 0, 0);
      return;
    }

    const totalItems = filteredBookings.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedItems = filteredBookings.slice(startIndex, endIndex);

    paginatedItems.forEach(b => {
      // The sample data is all Late Arrivals
      const statusBadge = `<span class="badge bg-danger rounded-pill px-3 py-1 text-white">Late Arrival</span>`;
      
      const guestName = (b.guestDetails && b.guestDetails.primaryGuest) ? `${b.guestDetails.primaryGuest.firstName} ${b.guestDetails.primaryGuest.lastName}` : b.email;
      const guestsCount = (b.adultsCount || 0) + (b.childrenCount || 0);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${b.id}</strong></td>
        <td>${guestName}</td>
        <td>${b.roomId}</td>
        <td>${b.checkIn}</td>
        <td>${guestsCount}</td>
        <td>${statusBadge}</td>
        <td class="text-end">
          <button class="btn btn-outline-dark btn-sm btn-process-checkin" style="border-radius: 6px; font-weight: 500;" data-id="${b.id}">Process Check-in</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    updatePagination(startIndex + 1, endIndex, totalItems);

    // Bind process buttons
    document.querySelectorAll('.btn-process-checkin').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        openCheckinModal(id);
      });
    });
  }

  function updatePagination(start, end, total) {
    const info = document.getElementById('paginationInfo');
    if (info) info.textContent = `Showing ${start} to ${end} of ${total} entries`;

    const totalPages = Math.ceil(total / itemsPerPage) || 1;
    const controls = document.getElementById('paginationControls');
    if (!controls) return;

    controls.innerHTML = `
      <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link text-purple" href="#" id="btnPrevPage">Previous</a>
      </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
      controls.innerHTML += `
        <li class="page-item ${currentPage === i ? 'active' : ''}">
          <a class="page-link ${currentPage === i ? 'bg-purple border-purple text-white' : 'text-purple'}" href="#" data-page="${i}">${i}</a>
        </li>
      `;
    }

    controls.innerHTML += `
      <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link text-purple" href="#" id="btnNextPage">Next</a>
      </li>
    `;

    const prevBtn = document.getElementById('btnPrevPage');
    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.preventDefault(); if (currentPage > 1) { currentPage--; renderTable(); } });
    
    const nextBtn = document.getElementById('btnNextPage');
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.preventDefault(); if (currentPage < totalPages) { currentPage++; renderTable(); } });
    
    controls.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        currentPage = parseInt(e.target.getAttribute('data-page'));
        renderTable();
      });
    });
  }

  // Filter Bindings
  const btnApplyCheckinFilters = document.getElementById('btnApplyCheckinFilters');
  if (btnApplyCheckinFilters) {
    btnApplyCheckinFilters.addEventListener('click', () => {
      currentSearch = (document.getElementById('checkinSearch')?.value || '').toLowerCase().trim();
      currentRoom = (document.getElementById('checkinRoom')?.value || '').toLowerCase().trim();
      currentBranch = document.getElementById('checkinBranch')?.value || 'all';
      applyFilters();
    });
  }

  const btnResetCheckinFilters = document.getElementById('btnResetCheckinFilters');
  if (btnResetCheckinFilters) {
    btnResetCheckinFilters.addEventListener('click', () => {
      if(document.getElementById('checkinSearch')) document.getElementById('checkinSearch').value = '';
      if(document.getElementById('checkinRoom')) document.getElementById('checkinRoom').value = '';
      if(document.getElementById('checkinBranch')) document.getElementById('checkinBranch').value = 'all';
      
      currentSearch = '';
      currentRoom = '';
      currentBranch = 'all';
      applyFilters();
    });
  }

  let currentProcessId = null;

  function openCheckinModal(id) {
    currentProcessId = id;
    const b = checkinBookings.find(x => x.id === id);
    if (!b) return;

    const assignedRoomInput = document.getElementById('checkinAssignedRoom');
    if (assignedRoomInput) {
      assignedRoomInput.value = b.roomId;
    }
    
    // Clear other inputs
    const checkinDocId = document.getElementById('checkinDocId');
    if(checkinDocId) checkinDocId.value = '';
    
    const checkinSecurityCollected = document.getElementById('checkinSecurityCollected');
    if(checkinSecurityCollected) checkinSecurityCollected.checked = false;

    const modal = new bootstrap.Modal(document.getElementById('checkinWizardModal'));
    modal.show();
  }

  const btnSubmitCheckin = document.getElementById('btnSubmitCheckin');
  if (btnSubmitCheckin) {
    btnSubmitCheckin.addEventListener('click', () => {
      if (!currentProcessId) return;

      const bIndex = HotelState.bookings.findIndex(x => x.id === currentProcessId);
      if (bIndex === -1) return;

      const b = HotelState.bookings[bIndex];

      // Update booking
      b.bookingStatus = 'CheckedIn';
      b.updatedAt = new Date().toISOString();
      HotelState.bookings[bIndex] = b; // trigger setter if it existed, but we have to save it via HotelState.bookings = HotelState.bookings
      HotelState.bookings = HotelState.bookings; // Trigger save

      // Update Room status
      HotelState.updateRoomStatus(b.hotelId, b.roomId, 'Occupied');

      
            

      // Add Notification for customer
      HotelState.addNotification({
        userId: b.customerId || b.email,
        role: 'Customer',
        title: 'Check-In Successful',
        message: `Welcome to ${hotel.name}! Your room ${b.roomId} is ready.`,
        type: 'checkin'
      });

      // Close modal
      const modalEl = document.getElementById('checkinWizardModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      // Show toast
      const toastEl = document.getElementById('statusToast');
      if (toastEl) {
        document.getElementById('toastMessage').textContent = `Check-in process finalized for ${b.id}.`;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
      }

      loadCheckins();
    });
  }

  loadCheckins();
});
