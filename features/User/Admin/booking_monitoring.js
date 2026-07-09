// Admin Session Check
const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');
const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

if (!isLoggedIn || userRole !== 'Admin') {
  window.location.href = '../../../features/Auth/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  let allBookings = HotelState.bookings || [];

  const tblBody = document.querySelector('#tblBookings tbody');
  const tblHistoryBody = document.querySelector('#tblHistory tbody');
  
  const filterBranch = document.getElementById('filterBranch');
  const filterStatus = document.getElementById('filterStatus');
  const filterDateRange = document.getElementById('filterDateRange');
  const btnResetFilters = document.getElementById('btnResetFilters');
  const btnApplyFilters = document.getElementById('btnApplyFilters');

  // Search input - we can add live search
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search by booking ID or guest name...';
  searchInput.className = 'form-control form-control-sm mb-3';
  document.querySelector('#all-bookings').insertBefore(searchInput, document.querySelector('#all-bookings .card'));

  function showToast(message, isSuccess = true) {
    const toastMessage = document.getElementById('toastMessage');
    const toastEl = document.getElementById('statusToast');
    if (toastEl) {
      toastEl.className = `toast align-items-center text-white border-0 shadow ${isSuccess ? 'bg-success' : 'bg-danger'}`;
      toastMessage.textContent = message;
      const toast = new bootstrap.Toast(toastEl);
      toast.show();
    }
  }

  function getStatusBadge(b) {
    // Use the stored operational status for the admin view (Confirmed, CheckedIn, etc.)
    const opStatus = b.bookingStatus || b.status || '';
    switch (opStatus) {
      case 'Confirmed':  return '<span class="badge bg-success">Confirmed</span>';
      case 'CheckedIn':  return '<span class="badge bg-primary">Checked In</span>';
      case 'CheckedOut': return '<span class="badge bg-secondary">Checked Out</span>';
      case 'Cancelled':  return '<span class="badge bg-danger">Cancelled</span>';
      default: {
        // Fallback: derive display from real dates
        const lc = HotelState.getBookingLifecycle(b);
        const colourMap = {
          'upcoming':        'bg-primary',
          'upcoming-locked': 'bg-warning text-dark',
          'active':          'bg-success',
          'completed':       'bg-secondary',
          'cancelled':       'bg-danger'
        };
        const cls = colourMap[lc.stage] || 'bg-warning text-dark';
        return `<span class="badge ${cls}">${lc.displayStatus}</span>`;
      }
    }
  }

  function getCustomerName(b) {
    const cust = HotelState.users.find(u => u.id === b.customerId || u.email === b.email);
    return cust ? (cust.firstName ? `${cust.firstName} ${cust.lastName}` : (cust.name || cust.email)) : b.email;
  }

  function filterData(data, includeHistory = false) {
    const q = searchInput.value.toLowerCase().trim();
    const branchVal = filterBranch ? filterBranch.value : 'all';
    const statusVal = filterStatus ? filterStatus.value : 'all';
    const dateVal = filterDateRange ? filterDateRange.value : 'This Month';

    return data.filter(b => {
      // History tab filter check
      if (includeHistory) {
        if (!['CheckedOut', 'Cancelled'].includes(b.bookingStatus)) return false;
      } else {
        // Active bookings tab
        if (statusVal === 'all' && ['CheckedOut', 'Cancelled'].includes(b.bookingStatus)) return false;
      }

      // Branch search matching
      if (branchVal !== 'all') {
        const hotel = HotelState.getHotelById(b.hotelId);
        if (!hotel || !hotel.name.toLowerCase().includes(branchVal.toLowerCase())) return false;
      }

      // Status matching
      if (statusVal !== 'all' && b.bookingStatus !== statusVal) return false;

      // Query matching
      if (q) {
        const name = getCustomerName(b).toLowerCase();
        if (!b.id.toLowerCase().includes(q) && !name.includes(q)) return false;
      }

      // Date range matching
      const bDate = new Date(b.checkIn);
      const today = new Date();
      if (dateVal === 'Today') {
        const todayStr = today.toISOString().split('T')[0];
        if (b.checkIn !== todayStr) return false;
      } else if (dateVal === 'Last 7 Days') {
        const diff = (today - bDate) / (1000 * 60 * 60 * 24);
        if (diff < 0 || diff > 7) return false;
      }

      return true;
    });
  }

  function renderAllBookings() {
    tblBody.innerHTML = '';
    const filtered = filterData(allBookings, false);

    if (filtered.length === 0) {
      tblBody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No active bookings found.</td></tr>`;
      return;
    }

    filtered.forEach(b => {
      const hotel = HotelState.getHotelById(b.hotelId);
      const hotelName = hotel ? hotel.name : b.hotelId;
      const guestName = getCustomerName(b);
      
      let actionButtons = `<button class="btn btn-sm btn-outline-purple py-0 px-2 me-1 btn-view-booking" data-id="${b.id}">View</button>`;
      if (b.bookingStatus === 'Confirmed') {
        actionButtons += `
          <button class="btn btn-sm btn-outline-danger py-0 px-2 me-1 btn-cancel-booking" data-id="${b.id}">Cancel</button>
          <button class="btn btn-sm btn-outline-warning py-0 px-2 btn-noshow-booking" data-id="${b.id}">No-Show</button>
        `;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${b.id}</strong></td>
        <td>${guestName}</td>
        <td>${hotelName}</td>
        <td>${b.roomId}</td>
        <td>${b.checkIn}</td>
        <td>${b.checkOut}</td>
        <td>${getStatusBadge(b)}</td>
        <td>${b.paymentStatus || 'Pending'}</td>
        <td>₹${b.grandTotal.toLocaleString('en-IN')}</td>
        <td class="text-end text-nowrap">${actionButtons}</td>
      `;
      tblBody.appendChild(tr);
    });

    bindActionButtons();
  }

  function renderHistory() {
    tblHistoryBody.innerHTML = '';
    const filtered = filterData(allBookings, true);

    if (filtered.length === 0) {
      tblHistoryBody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No booking history records found.</td></tr>`;
      return;
    }

    filtered.forEach(b => {
      const hotel = HotelState.getHotelById(b.hotelId);
      const hotelName = hotel ? hotel.name : b.hotelId;
      const guestName = getCustomerName(b);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${b.id}</strong></td>
        <td>${guestName}</td>
        <td>${hotelName}</td>
        <td>${b.roomId}</td>
        <td>${b.checkIn}</td>
        <td>${b.checkOut}</td>
        <td>${getStatusBadge(b)}</td>
        <td>${b.paymentStatus || 'Settled'}</td>
        <td>₹${b.grandTotal.toLocaleString('en-IN')}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-purple py-0 px-2 btn-view-invoice" data-id="${b.id}"><i class="bi bi-file-earmark-pdf"></i> Invoice</button>
        </td>
      `;
      tblHistoryBody.appendChild(tr);
    });

    document.querySelectorAll('.btn-view-invoice').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        sessionStorage.setItem('hbs_last_booking_id', id); // using session variable
        location.href = '../../bookings/booking_success.html'; // view invoice page or success invoice stub
      });
    });
  }

  function bindActionButtons() {
    document.querySelectorAll('.btn-view-booking').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        sessionStorage.setItem('adminViewBookingId', id);
        location.href = 'view_booking.html';
      });
    });

    document.querySelectorAll('.btn-cancel-booking').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm(`Are you sure you want to cancel booking ${id}?`)) {
          cancelBookingAction(id, 'Cancelled');
        }
      });
    });

    document.querySelectorAll('.btn-noshow-booking').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (confirm(`Mark booking ${id} as No-Show?`)) {
          cancelBookingAction(id, 'No-Show');
        }
      });
    });
  }

  function cancelBookingAction(id, newStatus) {
    const list = HotelState.bookings;
    const idx = list.findIndex(x => x.id === id);
    if (idx === -1) return;

    const b = list[idx];
    b.bookingStatus = newStatus;
    b.updatedAt = new Date().toISOString();
    list[idx] = b;
    HotelState.bookings = list;

    // Free Room
    HotelState.updateRoomStatus(b.hotelId, b.roomId, 'Available');

    // Audit Log

    // Customer Notification
    HotelState.addNotification({
      userId: b.customerId || b.email,
      role: 'Customer',
      title: newStatus === 'Cancelled' ? 'Booking Cancelled' : 'Booking Missed (No-Show)',
      message: `Your booking ${b.id} has been marked as ${newStatus}.`,
      type: 'system'
    });

    showToast(`Booking ${b.id} status updated to ${newStatus}.`, true);
    refreshAll();
  }

  // ==========================================
  // CALENDAR LOGIC
  // ==========================================
  let currentCalDate = new Date();
  
  function renderCalendar() {
    const daysContainer = document.getElementById('calendarDays');
    const monthTitle = document.getElementById('calendarMonthTitle');
    if (!daysContainer || !monthTitle) return;

    daysContainer.innerHTML = '';

    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    monthTitle.textContent = `${monthNames[month]} ${year}`;

    // Get first day of month
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Fill blank padding
    for (let i = 0; i < firstDay; i++) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'border p-2 bg-light text-muted small text-center';
      emptyDiv.style.minHeight = '60px';
      daysContainer.appendChild(emptyDiv);
    }

    // Fill days
    for (let d = 1; d <= totalDays; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      const checkins = allBookings.filter(b => b.checkIn === dStr && b.bookingStatus !== 'Cancelled');
      const checkouts = allBookings.filter(b => b.checkOut === dStr && b.bookingStatus !== 'Cancelled');

      let badgeColor = '';
      if (checkins.length > 0 && checkouts.length > 0) badgeColor = 'orange'; // both
      else if (checkins.length > 0) badgeColor = '#10B981'; // check-in days
      else if (checkouts.length > 0) badgeColor = '#EF4444'; // check-out days

      const dayDiv = document.createElement('div');
      dayDiv.className = 'border p-2 bg-white text-center cursor-pointer position-relative d-flex flex-column justify-content-between';
      dayDiv.style.minHeight = '65px';
      dayDiv.innerHTML = `<span class="fw-bold small">${d}</span>`;
      
      if (badgeColor) {
        dayDiv.style.borderTop = `3px solid ${badgeColor}`;
        dayDiv.innerHTML += `
          <div class="d-flex flex-column gap-1">
            ${checkins.length > 0 ? `<span class="badge bg-success p-1" style="font-size: 0.6rem;">In: ${checkins.length}</span>` : ''}
            ${checkouts.length > 0 ? `<span class="badge bg-danger p-1" style="font-size: 0.6rem;">Out: ${checkouts.length}</span>` : ''}
          </div>
        `;
      }

      dayDiv.addEventListener('click', () => {
        showDayDetails(dStr, checkins, checkouts);
      });

      daysContainer.appendChild(dayDiv);
    }
  }

  function showDayDetails(dateStr, checkins, checkouts) {
    const title = document.getElementById('selectedDayTitle');
    const container = document.getElementById('dayActivityDetails');
    if (!title || !container) return;

    title.textContent = `Activity: ${dateStr}`;
    container.innerHTML = '';

    if (checkins.length === 0 && checkouts.length === 0) {
      container.innerHTML = `<p class="text-muted small">No check-ins or check-outs scheduled for this day.</p>`;
      return;
    }

    if (checkins.length > 0) {
      container.innerHTML += `<h6 class="fw-bold text-success small mb-2"><i class="bi bi-box-arrow-in-right"></i> Check-Ins (${checkins.length})</h6>`;
      checkins.forEach(b => {
        container.innerHTML += `
          <div class="p-2 border rounded bg-light mb-2 small">
            <strong>${b.id}</strong> - ${getCustomerName(b)}<br>
            Room: ${b.roomId} | Total: ₹${b.grandTotal.toLocaleString('en-IN')}
          </div>
        `;
      });
    }

    if (checkouts.length > 0) {
      container.innerHTML += `<h6 class="fw-bold text-danger small my-2"><i class="bi bi-box-arrow-right"></i> Check-Outs (${checkouts.length})</h6>`;
      checkouts.forEach(b => {
        container.innerHTML += `
          <div class="p-2 border rounded bg-light mb-2 small">
            <strong>${b.id}</strong> - ${getCustomerName(b)}<br>
            Room: ${b.roomId} | Total: ₹${b.grandTotal.toLocaleString('en-IN')}
          </div>
        `;
      });
    }
  }

  document.getElementById('btnPrevMonth')?.addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById('btnNextMonth')?.addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() + 1);
    renderCalendar();
  });

  // ==========================================
  // INITIALIZATION AND FILTERS
  // ==========================================
  if (btnApplyFilters) {
    btnApplyFilters.addEventListener('click', refreshAll);
  }

  if (searchInput) {
    searchInput.addEventListener('input', renderAllBookings);
  }

  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
      if (filterBranch) filterBranch.value = 'all';
      if (filterStatus) filterStatus.value = 'all';
      if (filterDateRange) filterDateRange.value = 'This Month';
      searchInput.value = '';
      refreshAll();
    });
  }

  function refreshAll() {
    allBookings = HotelState.bookings || [];
    renderAllBookings();
    renderHistory();
    renderCalendar();
  }

  // Export CSV
  window.exportReport = function(format) {
    if (format === 'CSV') {
      const filtered = filterData(allBookings, true);
      const csvString = 'Booking ID,Customer,Hotel,Room,Check-In,Check-Out,Status,Amount\n' +
        filtered.map(b => `"${b.id}","${getCustomerName(b)}","${HotelState.getHotelById(b.hotelId)?.name || b.hotelId}","${b.roomId}","${b.checkIn}","${b.checkOut}","${b.bookingStatus}",${b.grandTotal}`).join('\n');
      
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Booking_History_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('CSV downloaded successfully.', true);
    } else {
      showToast(`${format} export is currently simulated. Use CSV option for raw download.`, true);
    }
  };

  refreshAll();
});
