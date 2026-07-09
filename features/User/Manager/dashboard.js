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

  // 1. Calculate KPI Metrics
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const allBookings = HotelState.bookings.filter(b => b.hotelId === hotelId);
  const allRooms = HotelState.getRoomsByHotel(hotelId);
  const allHousekeeping = HotelState.housekeeping.filter(h => h.hotelId === hotelId);

  // Today's Check-ins
  const todayCheckins = allBookings.filter(b => b.bookingStatus === 'Confirmed' && b.checkIn === today).length;
  
  // Currently Checked In
  const currentlyCheckedIn = allBookings.filter(b => b.bookingStatus === 'CheckedIn').length;
  
  // Available Rooms
  const availableRooms = allRooms.filter(r => r.status === 'Available').length;
  
  // Pending Housekeeping
  const pendingHousekeeping = allHousekeeping.filter(h => h.status === 'Pending').length;
  
  // Today's Revenue (Checkout today)
  const todayRevenue = allBookings
    .filter(b => b.bookingStatus === 'CheckedOut' && b.updatedAt?.startsWith(today))
    .reduce((sum, b) => sum + b.grandTotal, 0);
  
  // Occupancy Rate
  const occupiedRooms = allRooms.filter(r => r.status === 'Occupied').length;
  const totalRooms = allRooms.length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  // Expected Departures Today
  const expectedDepartures = allBookings.filter(b => ['Confirmed', 'CheckedIn'].includes(b.bookingStatus) && b.checkOut === today).length;

  // 2. Bind KPI DOM Elements
  // Let's find the kpi cards inside dashboard.html.
  // The first row of 6 kpi cards: 
  // 1. Total Bookings (we will override this to Today's Check-Ins or just fill the elements)
  // Since dashboard.html doesn't have IDs for KPIs, we will query them by their titles or indices.
  const kpiCards = document.querySelectorAll('.kpi-card');
  if (kpiCards.length >= 6) {
    // 1: Check-ins Today
    kpiCards[0].querySelector('.uppercase-title').textContent = "Check-ins Today";
    kpiCards[0].querySelector('.fs-3').textContent = todayCheckins;
    kpiCards[0].querySelector('.small.text-muted.mt-1').textContent = "Confirmed for today";

    // 2: Active Guests (Checked In)
    kpiCards[1].querySelector('.uppercase-title').textContent = "Currently Checked In";
    kpiCards[1].querySelector('.fs-3').textContent = currentlyCheckedIn;
    kpiCards[1].querySelector('.small.text-muted.mt-1').textContent = "In-house guests";

    // 3: Occupancy Rate
    kpiCards[2].querySelector('.uppercase-title').textContent = "Occupancy Rate";
    kpiCards[2].querySelector('.fs-3').textContent = occupancyRate + '%';
    kpiCards[2].querySelector('.small.text-muted.mt-1').textContent = `${occupiedRooms} of ${totalRooms} rooms`;

    // 4: Available Rooms
    kpiCards[3].querySelector('.uppercase-title').textContent = "Available Rooms";
    kpiCards[3].querySelector('.fs-3').textContent = availableRooms;
    kpiCards[3].querySelector('.small.text-muted.mt-1').textContent = "Ready for guests";

    // 5: Pending Housekeeping
    kpiCards[4].querySelector('.uppercase-title').textContent = "Pending Housekeeping";
    kpiCards[4].querySelector('.fs-3').textContent = pendingHousekeeping;
    kpiCards[4].querySelector('.small.text-muted.mt-1').textContent = "Tasks awaiting completion";

    // 6: Today's Revenue
    kpiCards[5].querySelector('.uppercase-title').textContent = "Today's Revenue";
    kpiCards[5].querySelector('.fs-3').textContent = todayRevenue.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    kpiCards[5].querySelector('.small.text-muted.mt-1').textContent = "From checkouts";
  }

  // 3. Render Today's Activity (Recent bookings / pending requests)
  // Recent Bookings Table
  const tbody = document.querySelector('.manager-premium-table tbody');
  if (tbody) {
    tbody.innerHTML = ''; // Clear hardcoded
    const recentBookings = allBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    
    if (recentBookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No recent bookings found.</td></tr>`;
    } else {
      recentBookings.forEach(b => {
        let statusBadge = '';
        if (b.bookingStatus === 'Confirmed') statusBadge = '<span class="badge bg-success-light text-success rounded-pill px-3 py-1">Confirmed</span>';
        else if (b.bookingStatus === 'CheckedIn') statusBadge = '<span class="badge bg-primary-light text-primary rounded-pill px-3 py-1">Checked In</span>';
        else if (b.bookingStatus === 'CheckedOut') statusBadge = '<span class="badge bg-secondary text-white rounded-pill px-3 py-1">Checked Out</span>';
        else if (b.bookingStatus === 'Cancelled') statusBadge = '<span class="badge bg-danger-light text-danger rounded-pill px-3 py-1">Cancelled</span>';
        else statusBadge = `<span class="badge bg-warning-light text-warning rounded-pill px-3 py-1">${b.bookingStatus}</span>`;

        const room = allRooms.find(r => r.id === b.roomId);
        const roomDisplay = room ? `${room.type} ${room.id.split('_')[1] || room.id}` : b.roomId;
        const guestName = (b.guestDetails && b.guestDetails.primaryGuest) ? `${b.guestDetails.primaryGuest.firstName} ${b.guestDetails.primaryGuest.lastName}` : b.email;

        tbody.innerHTML += `
          <tr>
            <td><strong>${b.id}</strong></td>
            <td>${guestName}</td>
            <td>${roomDisplay}</td>
            <td>${b.checkIn}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      });
    }
  }

  // Pending Requests (Right column)
  const requestsContainer = document.querySelector('.col-lg-5 .d-flex.flex-column.gap-3');
  if (requestsContainer) {
    requestsContainer.innerHTML = '';
    const pendingRequests = HotelState.notifications.filter(n => n.hotelId === hotelId && !n.isRead && n.type !== 'system').slice(0, 3);
    
    if (pendingRequests.length === 0) {
      requestsContainer.innerHTML = `<div class="text-muted small text-center p-3 border rounded">No pending requests at this time.</div>`;
    } else {
      pendingRequests.forEach(req => {
        let icon = '<i class="bi bi-bell"></i>';
        if (req.type === 'booking') icon = '<i class="bi bi-calendar-check"></i>';
        if (req.type === 'maintenance') icon = '<i class="bi bi-tools"></i>';

        requestsContainer.innerHTML += `
          <div class="request-item-card p-3 rounded border d-flex gap-3 align-items-start bg-white shadow" style="border-radius: 14px !important;">
            <span class="req-icon">${icon}</span>
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-start">
                <strong class="text-dark small fw-bold">${req.title}</strong>
                <span class="small text-muted" style="font-size: 0.7rem;">${new Date(req.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <p class="small text-muted mb-2 mt-1">${req.message}</p>
              <span class="badge bg-warning text-dark rounded px-2" style="font-size: 0.65rem;">Pending</span>
            </div>
          </div>
        `;
      });
    }
  }

  // Room Availability Snapshot Block
  const availabilityList = document.querySelector('.availability-list');
  if (availabilityList) {
    availabilityList.innerHTML = '';
    const roomTypes = [...new Set(allRooms.map(r => r.type))];
    roomTypes.forEach(type => {
      const typeRooms = allRooms.filter(r => r.type === type);
      const occupied = typeRooms.filter(r => r.status === 'Occupied').length;
      const avail = typeRooms.filter(r => r.status === 'Available').length;
      const total = typeRooms.length;
      const percent = total > 0 ? Math.round((occupied/total)*100) : 0;
      
      availabilityList.innerHTML += `
        <li>
          <div class="d-flex justify-content-between mb-1">
            <span class="text-secondary">${type} (Total: ${total})</span>
            <span class="fw-semibold text-dark">${occupied} Occupied / ${avail} Available</span>
          </div>
          <div class="progress" style="height: 6px;">
            <div class="progress-bar" role="progressbar" style="width: ${percent}%; background-color: #D4AF37;" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"></div>
          </div>
        </li>
      `;
    });

    // Update bottom summary bar
    const summaryBar = document.querySelector('.col-lg-6 .p-3.bg-light.rounded');
    if (summaryBar) {
      const blocks = summaryBar.querySelectorAll('.fs-5');
      if (blocks.length >= 4) {
        blocks[0].textContent = totalRooms;
        blocks[1].textContent = occupiedRooms;
        blocks[2].textContent = availableRooms;
        blocks[3].textContent = occupancyRate + '%';
      }
    }
  }
  
  // Today's At-a-Glance
  const gaugePercent = document.querySelector('.fs-2.fw-bold.text-dark.d-block');
  if (gaugePercent) gaugePercent.textContent = occupancyRate + '%';
  
  const atGlanceStats = document.querySelectorAll('.col-md-7 .text-dark');
  if (atGlanceStats.length >= 3) {
    atGlanceStats[0].textContent = occupiedRooms;
    atGlanceStats[1].textContent = availableRooms;
    atGlanceStats[2].textContent = allRooms.filter(r => r.status === 'Maintenance').length;
  }
  
  const atGlanceExpected = document.querySelectorAll('.col-6 .fs-5.text-dark');
  if (atGlanceExpected.length >= 2) {
    atGlanceExpected[0].textContent = todayCheckins; // Arrivals
    atGlanceExpected[1].textContent = expectedDepartures; // Departures
  }

});
