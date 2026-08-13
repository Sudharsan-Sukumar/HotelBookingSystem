// Admin Session Check
const userId = localStorage.getItem('userId');
const userRole = (localStorage.getItem('userRole') || '').trim();
const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

if (!isLoggedIn || userRole !== 'Admin') {
  console.warn('Session check failed:', { isLoggedIn, userRole });
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

  let currentPageAll = 1;
  let currentPageHistory = 1;
  let itemsPerPage = 8;

  function renderPaginationControls(totalItems, currentPage, wrapperId, infoId, onPageChange) {
    const wrapper = document.getElementById(wrapperId);
    const info = document.getElementById(infoId);
    if (!wrapper || !info) return;

    wrapper.innerHTML = '';
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalItems === 0) {
      info.textContent = 'Showing 0 items';
      return;
    }

    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);
    info.innerHTML = `Showing <span class="fw-bold text-purple">${start}</span> to <span class="fw-bold text-purple">${end}</span> of <span class="fw-bold text-purple">${totalItems}</span> entries`;

    if (totalPages > 1) {
      const ul = document.createElement('ul');
      ul.className = 'pagination pagination-sm mb-0 gap-2 align-items-center';

      // Prev Button
      const prevLi = document.createElement('li');
      prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
      prevLi.innerHTML = `<button class="page-link rounded-circle border-0 shadow-sm text-dark d-flex align-items-center justify-content-center" style="width:32px; height:32px;"><i class="bi bi-chevron-left"></i></button>`;
      if (currentPage > 1) {
        prevLi.querySelector('button').onclick = () => onPageChange(currentPage - 1);
        prevLi.querySelector('button').onmouseenter = (e) => e.currentTarget.classList.add('bg-light');
        prevLi.querySelector('button').onmouseleave = (e) => e.currentTarget.classList.remove('bg-light');
      }
      ul.appendChild(prevLi);

      // Page numbers
      for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item`;
        const btn = document.createElement('button');
        
        if (i === currentPage) {
          btn.className = 'page-link rounded-circle border-0 shadow-sm text-white fw-bold d-flex align-items-center justify-content-center';
          btn.style.backgroundColor = '#1A0A2E';
        } else {
          btn.className = 'page-link rounded-circle border-0 shadow-sm text-dark d-flex align-items-center justify-content-center';
          btn.onmouseenter = () => btn.classList.add('bg-light');
          btn.onmouseleave = () => btn.classList.remove('bg-light');
          btn.onclick = () => onPageChange(i);
        }
        btn.style.width = '32px';
        btn.style.height = '32px';
        btn.textContent = i;
        
        li.appendChild(btn);
        ul.appendChild(li);
      }

      // Next Button
      const nextLi = document.createElement('li');
      nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
      nextLi.innerHTML = `<button class="page-link rounded-circle border-0 shadow-sm text-dark d-flex align-items-center justify-content-center" style="width:32px; height:32px;"><i class="bi bi-chevron-right"></i></button>`;
      if (currentPage < totalPages) {
        nextLi.querySelector('button').onclick = () => onPageChange(currentPage + 1);
        nextLi.querySelector('button').onmouseenter = (e) => e.currentTarget.classList.add('bg-light');
        nextLi.querySelector('button').onmouseleave = (e) => e.currentTarget.classList.remove('bg-light');
      }
      ul.appendChild(nextLi);

      wrapper.appendChild(ul);
    }
  }

  function renderAllBookings() {
    tblBody.innerHTML = '';
    const filtered = filterData(allBookings, false);

    if (filtered.length === 0) {
      tblBody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No active bookings found.</td></tr>`;
      renderPaginationControls(0, 1, 'allBookingsPaginationWrapper', 'allBookingsPageInfo', () => {});
      return;
    }

    const startIdx = (currentPageAll - 1) * itemsPerPage;
    const paginated = filtered.slice(startIdx, startIdx + itemsPerPage);

    paginated.forEach(b => {
      const hotel = HotelState.getHotelById(b.hotelId);
      const hotelName = hotel ? hotel.name : b.hotelId;
      const guestName = getCustomerName(b);
      
      let actionButtons = `<button class="btn btn-sm btn-outline-purple py-0 px-2 me-1 btn-view-booking" data-id="${b.id}">View</button>`;
      if (b.bookingStatus === 'Confirmed') {
        actionButtons += `
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

    renderPaginationControls(filtered.length, currentPageAll, 'allBookingsPaginationWrapper', 'allBookingsPageInfo', (page) => {
      currentPageAll = page;
      renderAllBookings();
    });

    bindActionButtons();
  }

  function renderHistory() {
    tblHistoryBody.innerHTML = '';
    const filtered = filterData(allBookings, true);

    if (filtered.length === 0) {
      tblHistoryBody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No booking history records found.</td></tr>`;
      renderPaginationControls(0, 1, 'historyPaginationWrapper', 'historyPageInfo', () => {});
      return;
    }

    const startIdx = (currentPageHistory - 1) * itemsPerPage;
    const paginated = filtered.slice(startIdx, startIdx + itemsPerPage);

    paginated.forEach(b => {
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

    renderPaginationControls(filtered.length, currentPageHistory, 'historyPaginationWrapper', 'historyPageInfo', (page) => {
      currentPageHistory = page;
      renderHistory();
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
    btnApplyFilters.addEventListener('click', () => {
      currentPageAll = 1;
      currentPageHistory = 1;
      refreshAll();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentPageAll = 1;
      renderAllBookings();
    });
  }

  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
      if (filterBranch) filterBranch.value = 'all';
      if (filterStatus) filterStatus.value = 'all';
      if (filterDateRange) filterDateRange.value = 'This Month';
      searchInput.value = '';
      currentPageAll = 1;
      currentPageHistory = 1;
      refreshAll();
    });
  }

  const allBookingsPageSizeSelector = document.getElementById('allBookingsPageSizeSelector');
  const historyPageSizeSelector = document.getElementById('historyPageSizeSelector');

  if (allBookingsPageSizeSelector) {
    allBookingsPageSizeSelector.addEventListener('change', (e) => {
      itemsPerPage = parseInt(e.target.value);
      if (historyPageSizeSelector) historyPageSizeSelector.value = itemsPerPage;
      currentPageAll = 1;
      currentPageHistory = 1;
      refreshAll();
    });
  }

  if (historyPageSizeSelector) {
    historyPageSizeSelector.addEventListener('change', (e) => {
      itemsPerPage = parseInt(e.target.value);
      if (allBookingsPageSizeSelector) allBookingsPageSizeSelector.value = itemsPerPage;
      currentPageAll = 1;
      currentPageHistory = 1;
      refreshAll();
    });
  }

  function updateKPIs(data) {
    document.getElementById('kpiTotal').textContent = data.length.toLocaleString('en-IN');
    const active = data.filter(b => !['CheckedOut', 'Cancelled'].includes(b.bookingStatus));
    document.getElementById('kpiActive').textContent = active.length;
    const confirmed = data.filter(b => b.bookingStatus === 'Confirmed').length;
    document.getElementById('kpiConfirmed').textContent = confirmed;
    const pending = data.filter(b => b.bookingStatus === 'Pending').length;
    document.getElementById('kpiPending').textContent = pending;
  }

  let trendChartInstance = null;
  let statusChartInstance = null;
  let occupancyChartInstance = null;
  let currentChartMode = 'daily';

  window.setChartMode = function(mode) {
    currentChartMode = mode;
    document.querySelectorAll('#trendChartTimeRange .btn').forEach(btn => {
      btn.classList.remove('active', 'btn-purple');
      btn.classList.add('btn-outline-purple');
      if(btn.textContent.toLowerCase() === mode) {
        btn.classList.remove('btn-outline-purple');
        btn.classList.add('active', 'btn-purple');
      }
    });
    refreshAll();
  };

  const selectActiveChart = document.getElementById('selectActiveChart');
  if (selectActiveChart) {
    selectActiveChart.addEventListener('change', (e) => {
      const val = e.target.value;
      document.getElementById('containerTrendChart').classList.add('d-none');
      document.getElementById('containerStatusChart').classList.add('d-none');
      document.getElementById('containerOccupancyChart').classList.add('d-none');
      document.getElementById('trendChartTimeRange').classList.add('d-none');
      
      if (val === 'trends') {
        document.getElementById('containerTrendChart').classList.remove('d-none');
        document.getElementById('trendChartTimeRange').classList.remove('d-none');
      } else if (val === 'status') {
        document.getElementById('containerStatusChart').classList.remove('d-none');
      } else if (val === 'occupancy') {
        document.getElementById('containerOccupancyChart').classList.remove('d-none');
      }
    });
  }

  function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  }

  function renderCharts(data) {
    // 1. Trend Chart
    const ctxTrend = document.getElementById('trendChart');
    if(ctxTrend) {
      if(trendChartInstance) trendChartInstance.destroy();
      const dateCounts = {};
      data.forEach(b => {
        let key = b.checkIn; // 'YYYY-MM-DD'
        if (currentChartMode === 'weekly') {
           const d = new Date(b.checkIn);
           key = `Week ${getWeekNumber(d)}, ${d.getFullYear()}`;
        } else if (currentChartMode === 'monthly') {
           const d = new Date(b.checkIn);
           const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
           key = `${mNames[d.getMonth()]} ${d.getFullYear()}`;
        }
        if(!dateCounts[key]) dateCounts[key] = 0;
        dateCounts[key]++;
      });
      const labels = Object.keys(dateCounts).sort();
      const values = labels.map(l => dateCounts[l]);
      
      trendChartInstance = new Chart(ctxTrend, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Bookings',
            data: values,
            borderColor: '#1A0A2E',
            backgroundColor: 'rgba(26,10,46,0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      });
    }

    // 2. Status Chart (Pie)
    const ctxStatus = document.getElementById('statusChart');
    if(ctxStatus) {
      if(statusChartInstance) statusChartInstance.destroy();
      const stCounts = {};
      data.forEach(b => {
        const s = b.bookingStatus;
        if(!stCounts[s]) stCounts[s] = 0;
        stCounts[s]++;
      });
      
      statusChartInstance = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels: Object.keys(stCounts),
          datasets: [{
            data: Object.values(stCounts),
            backgroundColor: ['#10B981', '#F59E0B', '#3B82F6', '#6B7280', '#EF4444']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right' } }
        }
      });
    }

    // 3. Occupancy Chart (Bar)
    const ctxOcc = document.getElementById('branchRatioChart');
    if(ctxOcc) {
      if(occupancyChartInstance) occupancyChartInstance.destroy();
      const brCounts = {};
      data.forEach(b => {
        const h = HotelState.getHotelById(b.hotelId);
        const name = h ? h.name.replace('Elegant Enclave ', '') : b.hotelId;
        if(!brCounts[name]) brCounts[name] = 0;
        brCounts[name]++;
      });

      occupancyChartInstance = new Chart(ctxOcc, {
        type: 'bar',
        data: {
          labels: Object.keys(brCounts),
          datasets: [{
            label: 'Bookings per Branch',
            data: Object.values(brCounts),
            backgroundColor: '#1A0A2E'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
      });
    }
  }

  function refreshAll() {
    allBookings = HotelState.bookings || [];
    const filtered = filterData(allBookings, false); // Active tab filter context for KPIs/Charts
    updateKPIs(allBookings);
    renderCharts(filtered);
    renderAllBookings();
    renderHistory();
    renderCalendar();
  }

  window.exportReport = function(format) {
    if (format === 'CSV') {
      const filtered = filterData(allBookings, true);
      const csvString = 'Booking ID,Customer,Hotel,Room,Check-In,Check-Out,Status,Amount\n' +
        filtered.map(b => `"${b.id}","${getCustomerName(b)}","${HotelState.getHotelById(b.hotelId)?.name || b.hotelId}","${b.roomId}","${b.checkIn}","${b.checkOut}","${b.bookingStatus}",${b.grandTotal}`).join('\n');
      
      const blob = new Blob([csvString], { type: 'text/csv' });
      triggerDownload(blob, `Booking_History_${new Date().toISOString().slice(0, 10)}.csv`);
      showToast('CSV downloaded successfully.', true);
    } else if (format === 'PDF') {
      const b64 = "JVBERi0xLjEKJcOkw7zDtsOfCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjwwCi9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagozIDAgb2JqCjw8Ci9UeXBlIC9QYWdlCi9QYXJlbnQgMiAwIFIKL01lZGlhQm94IFswIDAgMTAwIDEwMF0KL1Jlc291cmNlcyA8PAovRm9udCA8PAovRjEgPDwKL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9CYXNlRm9udCAvVGltZXMtUm9tYW4KPj4KPj4KPj4KL0NvbnRlbnRzIDQgMCBSCj4+CmVuZG9iago0IDAgb2JqCjw8IC9MZW5ndGggNTUgPj4Kc3RyZWFtCkJUCi9GMSAxOCBUZgowIDUwIFRECihEdW1teSBQREYpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDUKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE4IDAwMDAwIG4gCjAwMDAwMDAwNzcgMDAwMDAgbiAKMDAwMDAwMDEzNCAwMDAwMCBuIAowMDAwMDAwMzAyIDAwMDAwIG4gCnRyYWlsZXIKPDwKL1NpemUgNQovUm9vdCAxIDAgUgo+PgpzdGFydHhyZWYKMzkzCiUlRU9GCg==";
      const binStr = atob(b64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      triggerDownload(blob, `Booking_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast('Dummy PDF downloaded.', true);
    } else if (format === 'Excel') {
      const blob = new Blob(['Dummy Excel Content'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      triggerDownload(blob, `Booking_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast('Dummy Excel downloaded.', true);
    }
  };

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  refreshAll();
});
