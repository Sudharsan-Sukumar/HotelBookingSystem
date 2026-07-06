document.addEventListener('DOMContentLoaded', () => {
  let rooms = [
    { number: '101', type: 'Standard Room', floor: '1st Floor', status: 'Available', occupancy: 'Max 2 Guests', branch: 'Elegant Enclave Chennai' },
    { number: '102', type: 'Standard Room', floor: '1st Floor', status: 'Cleaning', occupancy: 'Max 2 Guests', branch: 'Elegant Enclave Chennai' },
    { number: '108', type: 'Standard Room', floor: '1st Floor', status: 'Occupied', occupancy: 'Max 2 Guests', branch: 'Elegant Enclave Chennai' },
    { number: '201', type: 'Executive Studio', floor: '2nd Floor', status: 'Occupied', occupancy: 'Max 2 Guests', branch: 'Elegant Enclave Chennai' },
    { number: '205', type: 'Executive Studio', floor: '2nd Floor', status: 'Available', occupancy: 'Max 2 Guests', branch: 'Elegant Enclave Chennai' },
    { number: '302', type: 'Deluxe Suite', floor: '3rd Floor', status: 'Maintenance', occupancy: 'Max 4 Guests', branch: 'Elegant Enclave Chennai' },
    { number: '305', type: 'Deluxe Suite', floor: '3rd Floor', status: 'Occupied', occupancy: 'Max 4 Guests', branch: 'Elegant Enclave Chennai' },
    { number: '501', type: 'Penthouse Suite', floor: '5th Floor', status: 'Occupied', occupancy: 'Max 6 Guests', branch: 'Elegant Enclave Chennai' }
  ];

  const gridContainer = document.getElementById('gridRoomsContainer');
  const txtSearchRoom = document.getElementById('txtSearchRoom');
  const selBranch = document.getElementById('selBranch');
  const selStatus = document.getElementById('selStatus');
  const btnReset = document.getElementById('btnResetRoomFilters');

  // Read branch manager context limitations
  const userBranch = localStorage.getItem('userBranch'); // 'Chennai', 'Coimbatore', 'Salem'

  // Pre-filter select branch options if manager is branch restricted
  if (userBranch) {
    if (selBranch) {
      selBranch.value = userBranch;
      selBranch.disabled = true; // Lock dropdown select option
    }
  }

  function renderRooms() {
    gridContainer.innerHTML = '';
    const q = txtSearchRoom.value.toLowerCase().trim();
    let branchVal = selBranch ? selBranch.value : 'all';
    if (userBranch) {
      branchVal = userBranch; // Override validation to logged-in manager branch
    }
    const statusVal = selStatus.value;

    // Filter array
    let filtered = rooms.filter(r => {
      if (q && !r.number.includes(q) && !r.floor.toLowerCase().includes(q)) return false;
      if (branchVal !== 'all' && !r.branch.toLowerCase().includes(branchVal.toLowerCase())) return false;
      if (statusVal !== 'all' && r.status !== statusVal) return false;
      return true;
    });

    if (filtered.length === 0) {
      gridContainer.innerHTML = `<div class="text-center py-4 col-12"><p class="text-muted">No rooms match filter parameters.</p></div>`;
      return;
    }

    filtered.forEach(r => {
      let cardBorderClass = 'border-secondary';
      let statusBadge = '';
      if (r.status === 'Available') {
        cardBorderClass = 'border-success';
        statusBadge = '<span class="badge bg-success">Available</span>';
      } else if (r.status === 'Occupied') {
        cardBorderClass = 'border-primary';
        statusBadge = '<span class="badge bg-primary">Occupied</span>';
      } else if (r.status === 'Cleaning') {
        cardBorderClass = 'border-warning text-dark';
        statusBadge = '<span class="badge bg-warning text-dark">Cleaning</span>';
      } else if (r.status === 'Maintenance') {
        cardBorderClass = 'border-danger';
        statusBadge = '<span class="badge bg-danger">Maintenance</span>';
      }

      let editButtonHTML = '';
      const isBranchMatch = !userBranch || r.branch.toLowerCase().includes(userBranch.toLowerCase());
      
      if (isBranchMatch) {
        editButtonHTML = `
          <div class="card-footer bg-white border-top-0 pt-0 pb-3">
            <button class="btn btn-outline-purple btn-sm w-100" onclick="triggerRoomEditModal('${r.number}')">
              <i class="bi bi-pencil-fill me-1"></i> Edit Room Details
            </button>
          </div>
        `;
      }

      const col = document.createElement('div');
      col.className = 'col-sm-6 col-md-4 col-lg-3';
      col.innerHTML = `
        <div class="card h-100 border-start border-4 ${cardBorderClass} shadow-sm d-flex flex-column justify-content-between">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h5 class="card-title m-0 font-serif fw-bold text-dark">Room ${r.number}</h5>
              ${statusBadge}
            </div>
            <h6 class="card-subtitle mb-1 text-muted small">${r.type}</h6>
            <p class="card-text mb-0 small text-secondary"><i class="bi bi-info-circle me-1"></i> ${r.occupancy}</p>
            <p class="card-text mb-1 small text-secondary"><i class="bi bi-layers me-1"></i> ${r.floor}</p>
            <p class="card-text mb-2 small text-secondary"><i class="bi bi-geo-alt me-1"></i> ${r.branch}</p>
          </div>
          ${editButtonHTML}
        </div>
      `;
      gridContainer.appendChild(col);
    });

    // Update KPI badges
    document.getElementById('kpiTotal').textContent = filtered.length;
    document.getElementById('kpiAvailable').textContent = filtered.filter(x => x.status === 'Available').length;
    document.getElementById('kpiOccupied').textContent = filtered.filter(x => x.status === 'Occupied').length;
    document.getElementById('kpiCleaning').textContent = filtered.filter(x => x.status === 'Cleaning').length;
    document.getElementById('kpiMaintenance').textContent = filtered.filter(x => x.status === 'Maintenance').length;
  }

  // Bind edit popup values and show modal callback
  window.triggerRoomEditModal = function(roomNumber) {
    const r = rooms.find(x => x.number === roomNumber);
    if (!r) return;

    document.getElementById('lblRoomTitle').textContent = `Room ${r.number}`;
    document.getElementById('editRoomNumberKey').value = r.number;

    // Show current value as placeholder in text box
    const txtType = document.getElementById('txtEditRoomType');
    const txtFloor = document.getElementById('txtEditRoomFloor');
    const txtOccupancy = document.getElementById('txtEditRoomOccupancy');
    const selStatusEl = document.getElementById('selEditRoomStatus');

    txtType.value = '';
    txtType.placeholder = r.type;

    txtFloor.value = '';
    txtFloor.placeholder = r.floor;

    txtOccupancy.value = '';
    txtOccupancy.placeholder = r.occupancy;

    selStatusEl.value = ''; // Reset option default selector

    const editModal = new bootstrap.Modal(document.getElementById('editRoomModal'));
    editModal.show();
  };

  // Form submit handler updating room items values
  const editForm = document.getElementById('editRoomForm');
  if (editForm) {
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const roomNum = document.getElementById('editRoomNumberKey').value;
      const r = rooms.find(x => x.number === roomNum);
      if (!r) return;

      const txtTypeVal = document.getElementById('txtEditRoomType').value.trim();
      const txtFloorVal = document.getElementById('txtEditRoomFloor').value.trim();
      const txtOccupancyVal = document.getElementById('txtEditRoomOccupancy').value.trim();
      const statusVal = document.getElementById('selEditRoomStatus').value;

      // Enter empty to keep current value constraint check
      if (txtTypeVal) r.type = txtTypeVal;
      if (txtFloorVal) r.floor = txtFloorVal;
      if (txtOccupancyVal) r.occupancy = txtOccupancyVal;
      if (statusVal) r.status = statusVal;

      // Close Modal
      const modalEl = document.getElementById('editRoomModal');
      const bootstrapModal = bootstrap.Modal.getInstance(modalEl);
      if (bootstrapModal) bootstrapModal.hide();

      // Refresh view
      renderRooms();

      // Show Status Toast
      const toastEl = document.getElementById('statusToast');
      if (toastEl) {
        document.getElementById('toastMessage').textContent = `Room ${r.number} specifications updated successfully!`;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
      }
    });
  }

  // Register New Room Form Submission Action
  const addRoomForm = document.getElementById('addRoomForm');
  if (addRoomForm) {
    // If manager has a locked branch profile, preset and lock the branch dropdown select selection
    const selAddRoomBranch = document.getElementById('selAddRoomBranch');
    if (userBranch && selAddRoomBranch) {
      const longBranchName = userBranch === 'Chennai' ? 'Elegant Enclave Chennai' : 
                             (userBranch === 'Coimbatore' ? 'Elegant Enclave Coimbatore' : 'Elegant Enclave Salem');
      selAddRoomBranch.value = longBranchName;
      selAddRoomBranch.disabled = true;
    }

    addRoomForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Inline Validation Check
      if (!addRoomForm.checkValidity()) {
        e.stopPropagation();
        addRoomForm.classList.add('was-validated');
        return;
      }

      const numVal = document.getElementById('txtAddRoomNumber').value.trim();
      
      // Check for duplicates
      if (rooms.some(x => x.number === numVal)) {
        document.getElementById('txtAddRoomNumber').classList.add('is-invalid');
        alert(`Room number ${numVal} already exists!`);
        return;
      }

      const typeVal = document.getElementById('selAddRoomType').value;
      const floorVal = document.getElementById('txtAddRoomFloor').value.trim();
      const occupancyVal = document.getElementById('txtAddRoomOccupancy').value.trim();
      const branchVal = document.getElementById('selAddRoomBranch').value;
      const statusVal = document.getElementById('selAddRoomStatus').value;

      const newRoom = {
        number: numVal,
        type: typeVal,
        floor: floorVal,
        occupancy: occupancyVal,
        status: statusVal,
        branch: branchVal
      };

      rooms.push(newRoom);
      
      // Close Modal
      const modalEl = document.getElementById('addRoomModal');
      const bootstrapModal = bootstrap.Modal.getInstance(modalEl);
      if (bootstrapModal) bootstrapModal.hide();

      // Reset Form State
      addRoomForm.reset();
      addRoomForm.classList.remove('was-validated');
      if (userBranch && selAddRoomBranch) {
        const longBranchName = userBranch === 'Chennai' ? 'Elegant Enclave Chennai' : 
                               (userBranch === 'Coimbatore' ? 'Elegant Enclave Coimbatore' : 'Elegant Enclave Salem');
        selAddRoomBranch.value = longBranchName;
      }

      // Refresh view grids
      renderRooms();

      // Show Status toast message
      const toastEl = document.getElementById('statusToast');
      if (toastEl) {
        document.getElementById('toastMessage').textContent = `Room ${numVal} registered successfully!`;
        const toast = new bootstrap.Toast(toastEl);
        toast.show();
      }
    });
  }

  // Pre-open add modal if URL contains ?action=add query param
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'add') {
    const addModal = new bootstrap.Modal(document.getElementById('addRoomModal'));
    addModal.show();
  }

  txtSearchRoom.addEventListener('input', renderRooms);
  selBranch.addEventListener('change', renderRooms);
  selStatus.addEventListener('change', renderRooms);

  btnReset.addEventListener('click', () => {
    txtSearchRoom.value = '';
    if (!userBranch) selBranch.value = 'all';
    selStatus.value = 'all';
    renderRooms();
  });

  renderRooms();
});
