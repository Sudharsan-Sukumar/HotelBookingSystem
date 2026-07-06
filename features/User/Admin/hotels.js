document.addEventListener('DOMContentLoaded', () => {
  let hotels = [
    { id: 'HBS-HTL-01', name: 'ElegantEnclave Salem', branch: 'Main Branch', city: 'Salem', manager: 'Suresh Patel', rooms: 38, status: 'Active' },
    { id: 'HBS-HTL-02', name: 'ElegantEnclave CBE', branch: 'City Centre', city: 'Coimbatore', manager: 'Priya Sharma', rooms: 32, status: 'Active' },
    { id: 'HBS-HTL-03', name: 'ElegantEnclave Chennai', branch: 'Central Station', city: 'Chennai', manager: 'Gita Reddy', rooms: 45, status: 'Pending' }
  ];

  const tblBody = document.querySelector('#tblHotels tbody');
  const hotelSearch = document.getElementById('hotelSearch');
  const cityFilter = document.getElementById('hotelCityFilter');
  const statusFilter = document.getElementById('hotelStatusFilter');
  const btnReset = document.getElementById('btnResetFilters');
  const btnApply = document.getElementById('btnApplyFilters');

  function showToast(message, isSuccess = true) {
    const toastMessage = document.getElementById('toastMessage');
    const toastEl = document.getElementById('statusToast');
    toastEl.className = `toast align-items-center text-white border-0 shadow ${isSuccess ? 'bg-success' : 'bg-danger'}`;
    toastMessage.textContent = message;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }

  function renderTable() {
    tblBody.innerHTML = '';
    const q = hotelSearch.value.toLowerCase().trim();
    const cityVal = cityFilter.value;
    const statusVal = statusFilter.value;

    let filtered = hotels.filter(h => {
      if (q && !h.name.toLowerCase().includes(q) && !h.id.toLowerCase().includes(q) && !h.city.toLowerCase().includes(q) && !h.manager.toLowerCase().includes(q)) return false;
      if (cityVal !== 'all' && h.city !== cityVal) return false;
      if (statusVal !== 'all' && h.status !== statusVal) return false;
      return true;
    });

    // Update KPIs
    document.getElementById('kpiTotal').textContent = hotels.length;
    document.getElementById('kpiRooms').textContent = hotels.reduce((acc, h) => acc + h.rooms, 0);
    document.getElementById('kpiActive').textContent = hotels.filter(h => h.status === 'Active').length;
    document.getElementById('kpiPending').textContent = hotels.filter(h => h.status === 'Pending').length;

    if (filtered.length === 0) {
      tblBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No hotels found.</td></tr>`;
      return;
    }

    filtered.forEach(h => {
      let statusBadge = '';
      if (h.status === 'Active') statusBadge = '<span class="badge bg-success">Active</span>';
      else if (h.status === 'Pending') statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
      else statusBadge = '<span class="badge bg-secondary">Inactive</span>';

      let actions = '';
      if (h.status === 'Pending') {
        actions += `
          <button class="btn btn-sm btn-outline-success py-0 px-2 me-1" onclick="approveHotel('${h.id}')">Approve</button>
        `;
      }

      actions += `
        <button class="btn btn-sm btn-outline-purple py-0 px-2 me-1" onclick="location.href='view_hotel.html?id=${h.id}'"><i class="bi bi-eye-fill me-1"></i>View</button>
      `;
      if (h.status !== 'Pending') {
        actions += `
          <button class="btn btn-sm btn-outline-purple py-0 px-2 me-1" onclick="location.href='edit_hotel.html?id=${h.id}'"><i class="bi bi-pencil-fill me-1"></i>Edit</button>
        `;
      }
      if (h.status === 'Active') {
        actions += `
          <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deactivateHotel('${h.id}')">Deactivate</button>
        `;
      } else if (h.status === 'Inactive') {
        actions += `
          <button class="btn btn-sm btn-outline-success py-0 px-2" onclick="activateHotel('${h.id}')">Activate</button>
        `;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${h.id}</strong></td>
        <td>${h.name}</td>
        <td>${h.branch}</td>
        <td>${h.city}</td>
        <td>${h.manager}</td>
        <td>${h.rooms}</td>
        <td>${statusBadge}</td>
        <td class="text-end text-nowrap">${actions}</td>
      `;
      tblBody.appendChild(tr);
    });
  }

  let activeConfirmAction = null;
  const customConfirmModal = new bootstrap.Modal(document.getElementById('customConfirmModal'));
  const customConfirmModalBody = document.getElementById('customConfirmModalBody');
  const btnConfirmActionSubmit = document.getElementById('btnConfirmActionSubmit');

  btnConfirmActionSubmit.addEventListener('click', () => {
    if (activeConfirmAction) {
      activeConfirmAction();
      activeConfirmAction = null;
    }
    customConfirmModal.hide();
  });

  window.approveHotel = function(id) {
    customConfirmModalBody.textContent = 'Approve this hotel registration request? Status will change to Active.';
    activeConfirmAction = () => {
      const h = hotels.find(x => x.id === id);
      if (h) {
        h.status = 'Active';
        showToast('Hotel approved successfully.', true);
        renderTable();
      }
    };
    customConfirmModal.show();
  };

  window.deactivateHotel = function(id) {
    customConfirmModalBody.textContent = 'Deactivate Hotel? The hotel branch will become unavailable for new room bookings.';
    activeConfirmAction = () => {
      const h = hotels.find(x => x.id === id);
      if (h) {
        h.status = 'Inactive';
        showToast('Hotel deactivated successfully.', true);
        renderTable();
      }
    };
    customConfirmModal.show();
  };

  window.activateHotel = function(id) {
    customConfirmModalBody.textContent = 'Activate Hotel? The hotel branch will become available for room bookings.';
    activeConfirmAction = () => {
      const h = hotels.find(x => x.id === id);
      if (h) {
        h.status = 'Active';
        showToast('Hotel activated successfully.', true);
        renderTable();
      }
    };
    customConfirmModal.show();
  };

  btnApply.addEventListener('click', renderTable);
  btnReset.addEventListener('click', () => {
    hotelSearch.value = '';
    cityFilter.value = 'all';
    statusFilter.value = 'all';
    renderTable();
  });

  renderTable();
});
