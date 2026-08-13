// Admin Session Check
const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');
const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

if (!isLoggedIn || userRole !== 'Admin') {
  window.location.href = '../../../features/Auth/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  let currentPage = 1;
  let rowsPerPage = 5;
  let roomTypes = HotelState.roomTypes || [];
  if (roomTypes.length === 0) {
    roomTypes = [
      { id: 'RT-001', name: 'Standard Room', maxCapacity: 2, basePrice: 3500, totalUnits: 30, propertiesCount: 3, branches: ['Salem', 'Coimbatore', 'Chennai'], status: 'Active' },
      { id: 'RT-002', name: 'Executive Studio', maxCapacity: 3, basePrice: 5500, totalUnits: 18, propertiesCount: 3, branches: ['Salem', 'Coimbatore', 'Chennai'], status: 'Active' },
      { id: 'RT-003', name: 'Deluxe Suite', maxCapacity: 4, basePrice: 8000, totalUnits: 24, propertiesCount: 3, branches: ['Salem', 'Coimbatore', 'Chennai'], status: 'Active' },
      { id: 'RT-004', name: 'Penthouse Suite', maxCapacity: 6, basePrice: 18000, totalUnits: 12, propertiesCount: 2, branches: ['Coimbatore', 'Chennai'], status: 'Active' },
      { id: 'RT-005', name: 'Family Room', maxCapacity: 6, basePrice: 6500, totalUnits: 0, propertiesCount: 0, branches: [], status: 'Disabled' }
    ];
    HotelState.roomTypes = roomTypes;
  }

  const tblBody = document.querySelector('#tblRoomTypes tbody');
  const typeSearch = document.getElementById('typeSearch');
  const statusFilter = document.getElementById('typeStatusFilter');
  const btnReset = document.getElementById('btnResetFilters');
  const btnApply = document.getElementById('btnApplyFilters');

  const customConfirmModal = new bootstrap.Modal(document.getElementById('customConfirmModal'));
  const customConfirmModalBody = document.getElementById('customConfirmModalBody');
  const btnConfirmActionSubmit = document.getElementById('btnConfirmActionSubmit');
  let activeConfirmAction = null;

  btnConfirmActionSubmit.addEventListener('click', () => {
    if (activeConfirmAction) {
      activeConfirmAction();
      activeConfirmAction = null;
    }
    customConfirmModal.hide();
  });
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

  function renderTable() {
    roomTypes = HotelState.roomTypes || [];
    
    tblBody.innerHTML = '';
    const q = typeSearch.value.toLowerCase().trim();
    const statusVal = statusFilter.value;
    const branchFilter = document.getElementById('typeBranchFilter');
    const branchVal = branchFilter ? branchFilter.value : 'all';

    let filtered = roomTypes.filter(rt => {
      if (!rt.branches) {
        if (rt.id === 'RT-004') rt.branches = ['Coimbatore', 'Chennai'];
        else if (rt.status === 'Disabled') rt.branches = [];
        else rt.branches = ['Salem', 'Coimbatore', 'Chennai'];
      }
      
      if (q && !rt.name.toLowerCase().includes(q) && !rt.id.toLowerCase().includes(q)) return false;
      if (statusVal !== 'all' && rt.status !== statusVal) return false;
      if (branchVal !== 'all') {
        const branches = rt.branches || [];
        if (!branches.includes(branchVal)) return false;
      }
      return true;
    });

    // Update KPI values
    document.getElementById('kpiTotalTypes').textContent = roomTypes.length;
    document.getElementById('kpiCapacity').textContent = `${roomTypes.reduce((acc, x) => acc + x.maxCapacity, 0)} Guests`;
    document.getElementById('kpiUnits').textContent = `${roomTypes.reduce((acc, x) => acc + x.totalUnits, 0)} Rooms`;
    
    const avgPrice = Math.round(roomTypes.reduce((acc, x) => acc + x.basePrice, 0) / (roomTypes.length || 1));
    document.getElementById('kpiAvgPrice').textContent = `Rs. ${avgPrice.toLocaleString()}`;

    const totalFiltered = filtered.length;
    const totalPages = Math.ceil(totalFiltered / rowsPerPage);
    if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

    if (totalFiltered === 0) {
      tblBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No room types found.</td></tr>`;
      renderPagination(0);
      return;
    }

    const startIndex = (currentPage - 1) * rowsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + rowsPerPage);

    paginated.forEach(rt => {
      let statusBadge = '';
      if (rt.status === 'Active') {
        statusBadge = '<span class="badge bg-success">Active</span>';
      } else {
        statusBadge = '<span class="badge bg-danger">Disabled</span>';
      }

      let unitLabel = rt.totalUnits > 0 ? `${rt.totalUnits} (Across ${rt.propertiesCount} properties)` : '0 (Inactive)';

      let actions = `
        <button class="btn btn-sm btn-outline-purple py-0 px-2 me-1" onclick="loadRoomTypeForEdit('${rt.id}')"><i class="bi bi-pencil-fill me-1"></i>Edit</button>
      `;

      if (rt.status === 'Active') {
        actions += `<button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="toggleStatus('${rt.id}', 'Disabled')">Disable</button>`;
      } else {
        actions += `<button class="btn btn-sm btn-outline-success py-0 px-2" onclick="toggleStatus('${rt.id}', 'Active')">Activate</button>`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${rt.id}</strong></td>
        <td>${rt.name}</td>
        <td>${rt.maxCapacity} Guests</td>
        <td>Rs. ${rt.basePrice.toLocaleString()}</td>
        <td>${unitLabel}</td>
        <td>${statusBadge}</td>
        <td class="text-end text-nowrap">${actions}</td>
      `;
      tblBody.appendChild(tr);
    });

    renderPagination(totalFiltered);
  }

  window.changePage = function(page) {
    currentPage = page;
    renderTable();
  };

  function renderPagination(totalFiltered) {
    const paginationControls = document.getElementById('paginationControls');
    const paginationInfo = document.getElementById('paginationInfo');
    const paginationList = document.getElementById('paginationList');
    
    if (totalFiltered === 0) {
      paginationControls.style.setProperty('display', 'none', 'important');
      return;
    }
    
    paginationControls.style.setProperty('display', 'flex', 'important');
    
    const totalPages = Math.ceil(totalFiltered / rowsPerPage);
    const startItem = (currentPage - 1) * rowsPerPage + 1;
    const endItem = Math.min(currentPage * rowsPerPage, totalFiltered);
    
    paginationInfo.textContent = `Showing ${startItem} to ${endItem} of ${totalFiltered} entries`;
    
    let html = '';
    
    // Prev
    html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
               <a class="page-link text-purple" href="#" onclick="changePage(${currentPage - 1}); return false;">Previous</a>
             </li>`;
             
    for (let i = 1; i <= totalPages; i++) {
      if (currentPage === i) {
        html += `<li class="page-item active">
                   <a class="page-link bg-purple border-purple text-white" href="#" onclick="changePage(${i}); return false;">${i}</a>
                 </li>`;
      } else {
        html += `<li class="page-item">
                   <a class="page-link text-purple" href="#" onclick="changePage(${i}); return false;">${i}</a>
                 </li>`;
      }
    }
    
    // Next
    html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
               <a class="page-link text-purple" href="#" onclick="changePage(${currentPage + 1}); return false;">Next</a>
             </li>`;
             
    paginationList.innerHTML = html;
  }

  window.toggleStatus = function(id, newStatus) {
    const rt = roomTypes.find(x => x.id === id);
    if (rt) {
      if (newStatus === 'Disabled') {
        customConfirmModalBody.textContent = rt.totalUnits > 0 
          ? `This room type is currently assigned to ${rt.totalUnits} rooms. Are you sure you want to disable it?` 
          : 'Are you sure you want to disable this room type?';
      } else {
        customConfirmModalBody.textContent = 'Are you sure you want to activate this room type?';
      }
      
      activeConfirmAction = () => {
        rt.status = newStatus;
        HotelState.roomTypes = roomTypes;
        showToast(`Room type ${newStatus === 'Active' ? 'Activated' : 'Disabled'} Successfully.`, true);
        renderTable();
      };
      
      customConfirmModal.show();
    }
  };

  btnApply.addEventListener('click', () => {
    currentPage = 1;
    renderTable();
  });
  btnReset.addEventListener('click', () => {
    typeSearch.value = '';
    statusFilter.value = 'all';
    const branchFilter = document.getElementById('typeBranchFilter');
    if (branchFilter) branchFilter.value = 'all';
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

  // Modal form submit logic & validations
  const modalForm = document.getElementById('modalAddRoomTypeForm');
  const amenityChips = document.querySelectorAll('.select-amenity');
  const modalAmenities = document.getElementById('modalAmenities');

  // Selectable amenity chips
  amenityChips.forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('bg-primary');
      chip.classList.toggle('text-white');
      
      const selected = [];
      document.querySelectorAll('.select-amenity.bg-primary').forEach(c => {
        selected.push(c.textContent.trim());
      });
      modalAmenities.value = selected.join(', ');
    });
  });

  modalForm.addEventListener('submit', (e) => {
    e.preventDefault();

    let isValid = true;
    const nameInput = document.getElementById('modalTypeName');
    const capacityInput = document.getElementById('modalMaxCapacity');
    const adultsInput = document.getElementById('modalMaxAdults');
    const childrenInput = document.getElementById('modalMaxChildren');
    const basePriceInput = document.getElementById('modalBasePrice');
    const weekendPriceInput = document.getElementById('modalWeekendPrice');
    const holidayPriceInput = document.getElementById('modalHolidayPrice');
    const bedsInput = document.getElementById('modalBeds');

    // Reset validations
    modalForm.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

    const required = [nameInput, capacityInput, adultsInput, childrenInput, basePriceInput, bedsInput];
    required.forEach(f => {
      if (!f.value.trim()) {
        f.classList.add('is-invalid');
        isValid = false;
      }
    });

    const cap = parseInt(capacityInput.value) || 0;
    const adults = parseInt(adultsInput.value) || 0;
    const children = parseInt(childrenInput.value) || 0;
    const base = parseFloat(basePriceInput.value) || 0;

    if (cap < 1 || cap > 20) {
      capacityInput.classList.add('is-invalid');
      isValid = false;
    }
    if (adults > cap || (adults + children) > cap) {
      adultsInput.classList.add('is-invalid');
      childrenInput.classList.add('is-invalid');
      isValid = false;
    }
    if (base <= 0) {
      basePriceInput.classList.add('is-invalid');
      isValid = false;
    }

    const nameExists = roomTypes.some(x => x.name.toLowerCase() === nameInput.value.toLowerCase().trim());
    if (nameExists) {
      alert('A room type with this name already exists.');
      nameInput.classList.add('is-invalid');
      isValid = false;
    }

    if (isValid) {
      const submitBtn = document.getElementById('btnModalSubmit');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Creating...';

      setTimeout(() => {
        const nextId = `RT-00${roomTypes.length + 1}`;
        roomTypes.push({
          id: nextId,
          name: nameInput.value.trim(),
          maxCapacity: cap,
          basePrice: base,
          totalUnits: 0,
          propertiesCount: 0,
          branches: [],
          status: document.getElementById('modalStatus').value
        });
        HotelState.roomTypes = roomTypes;

        // Hide Modal
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('addRoomTypeModal'));
        modalInstance.hide();

        modalForm.reset();
        document.querySelectorAll('.select-amenity.bg-primary').forEach(c => {
          c.classList.remove('bg-primary', 'text-white');
        });
        
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-plus-lg me-1"></i> Create Room Type';

        showToast('Room Type created successfully.', true);
        renderTable();
      }, 1000);
    }
  });

  const editModal = new bootstrap.Modal(document.getElementById('editRoomTypeModal'));
  const editForm = document.getElementById('modalEditRoomTypeForm');
  const priceWarning = document.getElementById('priceWarningBanner');
  let originalPrice = 0;

  window.loadRoomTypeForEdit = function(id) {
    const rt = roomTypes.find(x => x.id === id);
    if (!rt) return;

    document.getElementById('editRoomTypeId').value = rt.id;
    document.getElementById('editTypeName').value = rt.name;
    document.getElementById('editMaxCapacity').value = rt.maxCapacity;
    document.getElementById('editMaxAdults').value = Math.max(1, rt.maxCapacity - 1);
    document.getElementById('editMaxChildren').value = 1;
    document.getElementById('editBasePrice').value = rt.basePrice;
    document.getElementById('editBeds').value = rt.id === 'RT-001' ? '1 Queen Size Bed' : '2 Queen Beds';
    document.getElementById('editStatus').value = rt.status;
    document.getElementById('editDescription').value = rt.id === 'RT-001' ? 'Cozy comfortable standard guest room' : 'Luxurious room type';
    document.getElementById('editRoomSize').value = rt.id === 'RT-001' ? 250 : 380;
    document.getElementById('editDisplayOrder').value = 1;
    
    originalPrice = rt.basePrice;
    priceWarning.classList.add('d-none');

    document.querySelectorAll('.select-edit-amenity').forEach(chip => {
      chip.classList.remove('bg-primary', 'text-white');
    });
    document.getElementById('editAmenities').value = 'WiFi, AC, Television';
    document.querySelectorAll('.select-edit-amenity').forEach(c => {
      if (['WiFi', 'AC', 'Television'].includes(c.textContent.trim())) {
        c.classList.add('bg-primary', 'text-white');
      }
    });

    editModal.show();
  };

  document.querySelectorAll('.select-edit-amenity').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('bg-primary');
      chip.classList.toggle('text-white');
      const selected = [];
      document.querySelectorAll('.select-edit-amenity.bg-primary').forEach(c => {
        selected.push(c.textContent.trim());
      });
      document.getElementById('editAmenities').value = selected.join(', ');
    });
  });

  document.getElementById('editBasePrice').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0;
    if (val !== originalPrice) {
      priceWarning.classList.remove('d-none');
    } else {
      priceWarning.classList.add('d-none');
    }
  });

  editForm.addEventListener('submit', (e) => {
    e.preventDefault();

    let isValid = true;
    const nameVal = document.getElementById('editTypeName').value.trim();
    const cap = parseInt(document.getElementById('editMaxCapacity').value) || 0;
    const base = parseFloat(document.getElementById('editBasePrice').value) || 0;
    const rtId = document.getElementById('editRoomTypeId').value;

    if (!nameVal || cap <= 0 || base <= 0) {
      isValid = false;
      alert('Please fill out all mandatory fields.');
    }

    if (isValid) {
      const submitBtn = document.getElementById('btnEditModalSubmit');
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';

      setTimeout(() => {
        const rt = roomTypes.find(x => x.id === rtId);
        if (rt) {
          rt.name = nameVal;
          rt.maxCapacity = cap;
          rt.basePrice = base;
          rt.status = document.getElementById('editStatus').value;
        }
        HotelState.roomTypes = roomTypes;

        editModal.hide();
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-save me-1"></i> Save Changes';

        showToast('Room Type updated successfully.', true);
        renderTable();
      }, 1000);
    }
  });

  document.getElementById('btnDisableType').addEventListener('click', () => {
    const rtId = document.getElementById('editRoomTypeId').value;
    const rt = roomTypes.find(x => x.id === rtId);
    if (rt) {
      customConfirmModalBody.textContent = rt.totalUnits > 0
        ? `This room type is currently used by ${rt.totalUnits} rooms. Disabling it will prevent future assignments but will not affect existing bookings. Are you sure?`
        : 'Are you sure you want to disable this room type?';
        
      activeConfirmAction = () => {
        rt.status = 'Disabled';
        HotelState.roomTypes = roomTypes;
        editModal.hide();
        showToast('Room Type disabled successfully.', true);
        renderTable();
      };
      
      customConfirmModal.show();
    }
  });

  renderTable();
});
