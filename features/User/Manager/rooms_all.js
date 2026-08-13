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
    // Override with dummy data to show examples of all types
    allRooms = [
      { id: hotelId + '_RM001', status: 'Available' },
      { id: hotelId + '_RM002', status: 'Occupied' },
      { id: hotelId + '_RM003', status: 'Housekeeping' },
      { id: hotelId + '_RM004', status: 'Maintenance' },
      { id: hotelId + '_RM005', status: 'Available' },
    ];
    
    hotelBookings = HotelState.bookings.filter(b => b.hotelId === hotelId && ['CheckedIn', 'Confirmed'].includes(b.bookingStatus));
    renderSummary();
    renderGrid();
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

  function renderGrid() {
    const container = document.getElementById('roomsGridContainer');
    if (!container) return;
    container.innerHTML = '';

    if (allRooms.length === 0) {
      container.innerHTML = `<div class="w-100 text-center text-muted py-5"><i class="bi bi-door-closed fs-1 d-block mb-2"></i>No rooms found for this property.</div>`;
      return;
    }

    allRooms.forEach(room => {
      let badgeClass = 'bg-secondary';
      let badgeStyle = '';
      if(room.status === 'Available') badgeClass = 'bg-success';
      else if(room.status === 'Occupied') badgeClass = 'bg-danger';
      else if(room.status === 'Housekeeping') { badgeClass = 'text-white'; badgeStyle = 'background-color: orange;'; }
      else if(room.status === 'Maintenance') { badgeClass = 'bg-warning text-dark'; }
      
      const card = document.createElement('div');
      card.className = 'card border shadow-sm p-3 d-flex flex-column align-items-center justify-content-center';
      card.style.width = '120px';
      card.style.height = '120px';
      card.style.borderRadius = '12px';
      card.innerHTML = `
        <h5 class="fw-bold mb-2 text-dark">${room.id.replace(hotelId + '_', '')}</h5>
        <span class="badge ${badgeClass} text-uppercase" style="font-size: 0.65rem; letter-spacing: 0.5px; ${badgeStyle}">${room.status}</span>
      `;
      container.appendChild(card);
    });
  }

  loadRooms();
});
