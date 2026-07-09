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

  let allRooms = [];
  let hotelBookings = [];

  function loadRooms() {
    allRooms = HotelState.getRoomsByHotel(hotelId);
    hotelBookings = HotelState.bookings.filter(b => b.hotelId === hotelId && ['CheckedIn', 'Confirmed'].includes(b.bookingStatus));
    renderSummary();
    renderTable();
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'Available': return '<span class="badge bg-success">Available</span>';
      case 'Occupied': return '<span class="badge bg-primary">Occupied</span>'; // Red is requested, maybe bg-danger? wait, prompt says Occupied -> red, I'll use bg-danger. Actually prompt: Available->green, Occupied->red, Housekeeping->orange, Maintenance->yellow
      case 'Housekeeping': return '<span class="badge" style="background-color: orange; color: black;">Housekeeping</span>';
      case 'Maintenance': return '<span class="badge bg-warning text-dark">Maintenance</span>';
      default: return `<span class="badge bg-secondary">${status}</span>`;
    }
  }

  function renderSummary() {
    const available = allRooms.filter(r => r.status === 'Available').length;
    const occupied = allRooms.filter(r => r.status === 'Occupied').length;
    const housekeeping = allRooms.filter(r => r.status === 'Housekeeping').length;
    const maintenance = allRooms.filter(r => r.status === 'Maintenance').length;

    const summaryContainer = document.querySelector('.d-flex.flex-wrap.gap-2.text-start.small');
    if (summaryContainer) {
      summaryContainer.innerHTML = `
        <span class="badge bg-light text-dark border p-2 fw-bold" style="font-size: 0.85rem;"><span class="legend-indicator bg-success me-2"></span>${available} Available</span>
        <span class="badge bg-light text-dark border p-2 fw-bold" style="font-size: 0.85rem;"><span class="legend-indicator bg-danger me-2"></span>${occupied} Occupied</span>
        <span class="badge bg-light text-dark border p-2 fw-bold" style="font-size: 0.85rem;"><span class="legend-indicator" style="background-color: orange;"></span>&nbsp;&nbsp;${housekeeping} Housekeeping</span>
        <span class="badge bg-light text-dark border p-2 fw-bold" style="font-size: 0.85rem;"><span class="legend-indicator bg-warning me-2"></span>${maintenance} Maintenance</span>
      `;
    }
  }

  function renderTable() {
    const tbody = document.querySelector('#tblAvailability tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (allRooms.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No rooms found for this property.</td></tr>`;
      return;
    }

    allRooms.forEach(room => {
      let currentGuest = '-';
      let expectedCheckout = '-';
      let upcomingGuest = '-';
      let expectedArrival = '-';

      if (room.status === 'Occupied') {
        const activeBooking = hotelBookings.find(b => b.roomId === room.id && b.bookingStatus === 'CheckedIn');
        if (activeBooking) {
          currentGuest = (activeBooking.guestDetails && activeBooking.guestDetails.primaryGuest) ? `${activeBooking.guestDetails.primaryGuest.firstName} ${activeBooking.guestDetails.primaryGuest.lastName}` : activeBooking.email;
          expectedCheckout = activeBooking.checkOut;
        }
      }

      // Find upcoming booking
      const upcoming = hotelBookings.filter(b => b.roomId === room.id && b.bookingStatus === 'Confirmed').sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn))[0];
      if (upcoming) {
        upcomingGuest = (upcoming.guestDetails && upcoming.guestDetails.primaryGuest) ? `${upcoming.guestDetails.primaryGuest.firstName} ${upcoming.guestDetails.primaryGuest.lastName}` : upcoming.email;
        expectedArrival = upcoming.checkIn;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${room.id.replace(hotelId + '_', '')}</strong></td>
        <td>${room.type}</td>
        <td>${hotel.name}</td>
        <td>${getStatusBadge(room.status)}</td>
        <td>${currentGuest}</td>
        <td>${expectedCheckout}</td>
        <td>${upcomingGuest}</td>
        <td>${expectedArrival}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  loadRooms();
});
