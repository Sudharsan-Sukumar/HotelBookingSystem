// Admin Session Check
const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');
const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

if (!isLoggedIn || userRole !== 'Admin') {
  window.location.href = '../../../features/Auth/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  let hotels = HotelState.hotels || [];

  const tblBody = document.querySelector('#tblHotels tbody');
  const hotelSearch = document.getElementById('hotelSearch');
  const cityFilter = document.getElementById('hotelCityFilter');
  const statusFilter = document.getElementById('hotelStatusFilter');
  const btnReset = document.getElementById('btnResetFilters');
  const btnApply = document.getElementById('btnApplyFilters');

  let currentPage = 1;
  let rowsPerPage = 10;

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

  window.navigateToViewHotel = function(id) {
    sessionStorage.setItem('adminViewHotelId', id);
    location.href = 'view_hotel.html';
  };

  window.navigateToEditHotel = function(id) {
    sessionStorage.setItem('adminEditHotelId', id);
    location.href = 'edit_hotel.html';
  };

  function renderTable() {
    hotels = HotelState.hotels || [];
    
    tblBody.innerHTML = '';
    const q = hotelSearch.value.toLowerCase().trim();
    const cityVal = cityFilter.value;
    const statusVal = statusFilter.value;

    let filtered = hotels.map(h => {
      const cityName = h.city || (h.location ? h.location.split(',')[0].trim() : 'Unknown');
      const branchName = h.branch || (h.name ? h.name.replace('Elegant Enclave ', '') + ' Branch' : 'Main');
      return { ...h, city: cityName, branch: branchName };
    }).filter(h => {
      const managerText = h.manager || h.managerId || '';
      if (q && !h.name.toLowerCase().includes(q) && !h.id.toLowerCase().includes(q) && !h.city.toLowerCase().includes(q) && !managerText.toLowerCase().includes(q)) return false;
      if (cityVal !== 'all' && h.city !== cityVal) return false;
      if (statusVal !== 'all' && h.status !== statusVal) return false;
      return true;
    });

    // Update KPIs
    document.getElementById('kpiTotal').textContent = hotels.length;
    const totalRooms = hotels.reduce((acc, h) => {
      const hRooms = HotelState.getRoomsByHotel(h.id) || [];
      return acc + hRooms.length;
    }, 0);
    document.getElementById('kpiRooms').textContent = totalRooms;
    document.getElementById('kpiActive').textContent = hotels.filter(h => h.status === 'Active').length;
    document.getElementById('kpiPending').textContent = hotels.filter(h => h.status === 'Pending').length;

    if (filtered.length === 0) {
      tblBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No hotels found.</td></tr>`;
      renderPagination(0);
      return;
    }

    const totalPages = Math.ceil(filtered.length / rowsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * rowsPerPage;
    const pagedData = filtered.slice(startIndex, startIndex + rowsPerPage);

    pagedData.forEach(h => {
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
        <button class="btn btn-sm btn-outline-purple py-0 px-2 me-1" onclick="navigateToViewHotel('${h.id}')"><i class="bi bi-eye-fill me-1"></i>View</button>
      `;
      if (h.status !== 'Pending') {
        actions += `
          <button class="btn btn-sm btn-outline-purple py-0 px-2 me-1" onclick="navigateToEditHotel('${h.id}')"><i class="bi bi-pencil-fill me-1"></i>Edit</button>
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

      const hRooms = HotelState.getRoomsByHotel(h.id) || [];
      const managerUser = HotelState.users.find(u => u.id === h.managerId);
      const managerName = managerUser ? `${managerUser.firstName} ${managerUser.lastName}` : (h.manager || 'Unassigned');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${h.id}</strong></td>
        <td>${h.name}</td>
        <td>${h.branch}</td>
        <td>${h.city}</td>
        <td>${managerName}</td>
        <td>${hRooms.length}</td>
        <td>${statusBadge}</td>
        <td class="text-end text-nowrap">${actions}</td>
      `;
      tblBody.appendChild(tr);
    });

    renderPagination(filtered.length);
  }

  function renderPagination(totalItems) {
    const controls = document.getElementById('paginationControls');
    const info = document.getElementById('paginationInfo');
    
    if (!controls || !info) return;

    if (totalItems === 0) {
      controls.innerHTML = '';
      info.textContent = 'Showing 0 entries';
      return;
    }

    const totalPages = Math.ceil(totalItems / rowsPerPage);
    const startIdx = (currentPage - 1) * rowsPerPage + 1;
    const endIdx = Math.min(startIdx + rowsPerPage - 1, totalItems);

    info.textContent = `Showing ${startIdx} to ${endIdx} of ${totalItems} entries`;

    let html = '';
    
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
               <a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>
             </li>`;

    for (let i = 1; i <= totalPages; i++) {
      html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
                 <a class="page-link" href="#" data-page="${i}">${i}</a>
               </li>`;
    }

    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
               <a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>
             </li>`;

    controls.innerHTML = html;

    controls.querySelectorAll('.page-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const li = e.target.closest('.page-item');
        if (li.classList.contains('disabled') || li.classList.contains('active')) return;
        
        currentPage = parseInt(e.target.getAttribute('data-page'));
        renderTable();
      });
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
      const list = HotelState.hotels;
      const h = list.find(x => x.id === id);
      if (h) {
        h.status = 'Active';
        HotelState.hotels = list;

        showToast('Hotel approved successfully.', true);
        renderTable();
      }
    };
    customConfirmModal.show();
  };

  window.deactivateHotel = function(id) {
    customConfirmModalBody.textContent = 'Deactivate Hotel? The hotel branch will become unavailable for new room bookings.';
    activeConfirmAction = () => {
      const list = HotelState.hotels;
      const h = list.find(x => x.id === id);
      if (h) {
        h.status = 'Inactive';
        HotelState.hotels = list;

        showToast('Hotel deactivated successfully.', true);
        renderTable();
      }
    };
    customConfirmModal.show();
  };

  window.activateHotel = function(id) {
    customConfirmModalBody.textContent = 'Activate Hotel? The hotel branch will become available for room bookings.';
    activeConfirmAction = () => {
      const list = HotelState.hotels;
      const h = list.find(x => x.id === id);
      if (h) {
        h.status = 'Active';
        HotelState.hotels = list;

        showToast('Hotel activated successfully.', true);
        renderTable();
      }
    };
    customConfirmModal.show();
  };

  if (btnApply) btnApply.addEventListener('click', () => {
    currentPage = 1;
    renderTable();
  });
  if (btnReset) btnReset.addEventListener('click', () => {
    hotelSearch.value = '';
    cityFilter.value = 'all';
    statusFilter.value = 'all';
    currentPage = 1;
    renderTable();
  });

  hotelSearch.addEventListener('input', () => {
    currentPage = 1;
    renderTable();
  });

  const pageSizeSelector = document.getElementById('pageSizeSelector');
  if (pageSizeSelector) {
    pageSizeSelector.addEventListener('change', (e) => {
      rowsPerPage = parseInt(e.target.value);
      currentPage = 1;
      renderTable();
    });
  }

  renderTable();
});
