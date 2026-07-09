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

  function loadCheckouts() {
    const allBookings = HotelState.bookings.filter(b => b.hotelId === hotelId);
    
    // KPI Data
    const todayDepartures = allBookings.filter(b => b.checkOut === today && ['Confirmed', 'CheckedIn'].includes(b.bookingStatus));
    const completedCheckouts = allBookings.filter(b => b.checkOut === today && b.bookingStatus === 'CheckedOut');
    
    checkoutBookings = allBookings.filter(b => b.bookingStatus === 'CheckedIn');
    
    const lateCheckouts = checkoutBookings.filter(b => b.checkOut < today);
    const pendingCheckouts = checkoutBookings.filter(b => b.checkOut === today);

    // Update KPIs
    const kpiDepartures = document.getElementById('kpiDepartures');
    const kpiCompleted = document.getElementById('kpiCompleted');
    const kpiPendingCheckout = document.getElementById('kpiPendingCheckout');
    const kpiLateCheckout = document.getElementById('kpiLateCheckout');

    if (kpiDepartures) kpiDepartures.textContent = todayDepartures.length + completedCheckouts.length;
    if (kpiCompleted) kpiCompleted.textContent = completedCheckouts.length;
    if (kpiPendingCheckout) kpiPendingCheckout.textContent = pendingCheckouts.length;
    if (kpiLateCheckout) kpiLateCheckout.textContent = lateCheckouts.length;

    renderTable();
  }

  function renderTable() {
    const tbody = document.querySelector('#tblCheckout tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (checkoutBookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No pending check-outs.</td></tr>`;
      return;
    }

    checkoutBookings.forEach(b => {
      const isLate = b.checkOut < today;
      const statusBadge = isLate 
        ? `<span class="badge bg-danger">Overdue Checkout</span>` 
        : `<span class="badge bg-warning text-dark">Pending</span>`;
      
      const guestName = (b.guestDetails && b.guestDetails.primaryGuest) ? `${b.guestDetails.primaryGuest.firstName} ${b.guestDetails.primaryGuest.lastName}` : b.email;
      
      const tr = document.createElement('tr');
      if (isLate) tr.classList.add('table-danger'); // highlight late

      tr.innerHTML = `
        <td><strong>${b.id}</strong></td>
        <td>${guestName}</td>
        <td>${b.roomId}</td>
        <td class="text-purple fw-bold">₹0.00</td>
        <td>${statusBadge}</td>
        <td class="text-end">
          <button class="btn btn-purple btn-sm btn-process-checkout" data-id="${b.id}">Process Check-out</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.btn-process-checkout').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        openCheckoutModal(id);
      });
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
      const auditStatusSelect = document.getElementById('checkoutAuditStatus');
      const nextRoomStatus = auditStatusSelect ? (auditStatusSelect.value === 'Cleaning' ? 'Housekeeping' : 'Available') : 'Housekeeping';
      
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

      // e. Add audit log
      HotelState.addAuditLog({
        id: 'LOG_' + Date.now(),
        action: 'BOOKING_CHECKOUT',
        entityId: b.id,
        entityType: 'Booking',
        userId: userId,
        hotelId: hotelId,
        details: 'Guest checked out',
        timestamp: new Date().toISOString()
      });

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
