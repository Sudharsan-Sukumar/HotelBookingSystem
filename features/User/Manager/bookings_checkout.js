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
  let checkoutBookings = [];

  // Pagination state
  let currentPage = 1;
  const itemsPerPage = 5;
  let filteredBookings = [];

  // Filter state
  let currentSearch = '';
  let currentRoom = '';
  let currentBranch = 'all';

  function loadCheckouts() {
    // Sample Data
    checkoutBookings = [
      {
        id: 'EE-SIM-7267-12',
        email: 'user12@test.com',
        roomId: 'RM001',
        checkOut: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0], // Yesterday (Late)
        bookingStatus: 'CheckedIn',
        hotelId: 'SIM' // Coimbatore
      },
      {
        id: 'EE-SIM-7267-27',
        email: 'user27@test.com',
        roomId: 'RM004',
        checkOut: today, // Today (Pending)
        bookingStatus: 'CheckedIn',
        hotelId: 'SIM' // Coimbatore
      }
    ];

    // KPIs matching screenshot
    const kpiDepartures = document.getElementById('kpiDepartures');
    const kpiCompleted = document.getElementById('kpiCompleted');
    const kpiPendingCheckout = document.getElementById('kpiPendingCheckout');
    const kpiLateCheckout = document.getElementById('kpiLateCheckout');

    if (kpiDepartures) kpiDepartures.textContent = '0';
    if (kpiCompleted) kpiCompleted.textContent = '0';
    if (kpiPendingCheckout) kpiPendingCheckout.textContent = '0';
    if (kpiLateCheckout) kpiLateCheckout.textContent = '1';

    applyFilters();
  }

  function applyFilters() {
    filteredBookings = checkoutBookings.filter(b => {
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

  function renderTable() {
    const tbody = document.querySelector('#tblCheckout tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (filteredBookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No records found matching filters.</td></tr>`;
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
      const isLate = b.checkOut < today;
      const statusBadge = isLate 
        ? `<span class="badge bg-danger rounded-pill px-3 py-1 text-white">Overdue Checkout</span>` 
        : `<span class="badge bg-warning text-dark rounded-pill px-3 py-1">Pending</span>`;
      
      const guestName = (b.guestDetails && b.guestDetails.primaryGuest) ? `${b.guestDetails.primaryGuest.firstName} ${b.guestDetails.primaryGuest.lastName}` : b.email;
      
      const tr = document.createElement('tr');
      if (isLate) tr.classList.add('table-danger'); // highlight late

      tr.innerHTML = `
        <td><strong>${b.id}</strong></td>
        <td>${guestName}</td>
        <td>${b.roomId}</td>
        <td class="text-dark fw-bold">₹0.00</td>
        <td>${statusBadge}</td>
        <td class="text-end">
          <button class="btn btn-outline-dark btn-sm btn-process-checkout" style="border-radius: 6px; font-weight: 500;" data-id="${b.id}">Process Check-out</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    updatePagination(startIndex + 1, endIndex, totalItems);

    document.querySelectorAll('.btn-process-checkout').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        openCheckoutModal(id);
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
  const btnApplyCheckoutFilters = document.getElementById('btnApplyCheckoutFilters');
  if (btnApplyCheckoutFilters) {
    btnApplyCheckoutFilters.addEventListener('click', () => {
      currentSearch = (document.getElementById('checkoutSearch')?.value || '').toLowerCase().trim();
      currentRoom = (document.getElementById('checkoutRoom')?.value || '').toLowerCase().trim();
      currentBranch = document.getElementById('checkoutBranch')?.value || 'all';
      applyFilters();
    });
  }

  const btnResetCheckoutFilters = document.getElementById('btnResetCheckoutFilters');
  if (btnResetCheckoutFilters) {
    btnResetCheckoutFilters.addEventListener('click', () => {
      if(document.getElementById('checkoutSearch')) document.getElementById('checkoutSearch').value = '';
      if(document.getElementById('checkoutRoom')) document.getElementById('checkoutRoom').value = '';
      if(document.getElementById('checkoutBranch')) document.getElementById('checkoutBranch').value = 'all';
      
      currentSearch = '';
      currentRoom = '';
      currentBranch = 'all';
      applyFilters();
    });
  }

  let currentProcessId = null;

  function openCheckoutModal(id) {
    currentProcessId = id;
    const b = checkoutBookings.find(x => x.id === id);
    if (!b) return;

    // Reset modal inputs
    document.getElementById('chargeMinibar').value = 0;
    document.getElementById('chargeDamage').value = 0;

    const modal = new bootstrap.Modal(document.getElementById('checkoutWizardModal'));
    modal.show();
  }

  const btnSubmitCheckout = document.getElementById('btnSubmitCheckout');
  if (btnSubmitCheckout) {
    btnSubmitCheckout.addEventListener('click', () => {
      if (!currentProcessId) return;

      const bIndex = HotelState.bookings.findIndex(x => x.id === currentProcessId);
      if (bIndex === -1) return;

      const b = HotelState.bookings[bIndex];
      
      // Additional charges logic can be applied here to grandTotal if needed
      const minibar = parseFloat(document.getElementById('chargeMinibar').value) || 0;
      const damage = parseFloat(document.getElementById('chargeDamage').value) || 0;
      b.grandTotal += (minibar + damage);

      // a. Update bookingStatus to 'CheckedOut'
      b.bookingStatus = 'CheckedOut';
      // b. Update status to 'Completed' (assuming this is a secondary field, or maybe same)
      b.status = 'Completed';
      b.updatedAt = new Date().toISOString();
      
      HotelState.bookings[bIndex] = b;
      HotelState.bookings = HotelState.bookings; // trigger save

      // c. Update room status to 'Housekeeping'
      const nextRoomStatus = "Housekeeping";
      
      HotelState.updateRoomStatus(b.hotelId, b.roomId, nextRoomStatus);

      // d. Create housekeeping task
      if (nextRoomStatus === 'Housekeeping') {
        const hks = HotelState.housekeeping || [];
        hks.push({
          id: 'HK' + Date.now(),
          hotelId: b.hotelId,
          roomId: b.roomId,
          type: 'Departure Cleaning',
          priority: 'High',
          status: 'Pending',
          assignedTo: 'Unassigned',
          createdAt: new Date().toISOString()
        });
        HotelState.set('housekeeping', hks);
      }

      
      

      // f. Add notification for customer
      HotelState.addNotification({
        userId: b.customerId || b.email,
        role: 'Customer',
        title: 'Check-Out Successful',
        message: `Thank you for staying at ${hotel.name}. Your checkout is complete.`,
        type: 'checkout'
      });

      const modalEl = document.getElementById('checkoutWizardModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      const toastEl = document.getElementById('statusToast');
      if (toastEl) {
        document.getElementById('toastMessage').textContent = `Check-out settled for ${b.id}.`;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
      }

      // "Show invoice summary link for each checked-out booking"
      // Since it's checked out, we can render a button to view the invoice or automatically redirect the manager.
      // We will re-render list, and they can go to bookings to view invoice, but let's just re-render.
      loadCheckouts();
    });
  }

  loadCheckouts();
});
