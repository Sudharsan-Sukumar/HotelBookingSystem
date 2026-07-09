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

  function loadCheckins() {
    const allBookings = HotelState.bookings.filter(b => b.hotelId === hotelId);
    
    // Calculate KPIs
    const todayArrivals = allBookings.filter(b => b.checkIn === today);
    totalArrivalsCount = todayArrivals.length;
    checkedInCount = todayArrivals.filter(b => b.bookingStatus === 'CheckedIn' || b.bookingStatus === 'CheckedOut').length;
    
    checkinBookings = allBookings.filter(b => {
      // Need to check-in if confirmed and date is today or past
      return b.bookingStatus === 'Confirmed' && b.checkIn <= today;
    });

    pendingArrivalsCount = checkinBookings.filter(b => b.checkIn === today).length;
    lateArrivalsCount = checkinBookings.filter(b => b.checkIn < today).length;

    renderKPIs();
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

    if (checkinBookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No pending check-ins at this time.</td></tr>`;
      return;
    }

    checkinBookings.forEach(b => {
      const isLate = b.checkIn < today;
      const statusBadge = isLate 
        ? `<span class="badge bg-danger">Late Arrival</span>` 
        : `<span class="badge bg-warning text-dark">Pending</span>`;
      
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
          <button class="btn btn-purple btn-sm btn-process-checkin" data-id="${b.id}">Process Check-in</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Bind process buttons
    document.querySelectorAll('.btn-process-checkin').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        openCheckinModal(id);
      });
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

      // Add audit log
      const audit = {
        id: 'LOG_' + Date.now(),
        action: 'BOOKING_CHECKIN',
        entityId: b.id,
        entityType: 'Booking',
        userId: userId,
        hotelId: hotelId,
        details: 'Guest checked in',
        timestamp: new Date().toISOString()
      };
      HotelState.addAuditLog(audit);

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
