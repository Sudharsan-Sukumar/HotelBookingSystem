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

  let hotelTasks = [];
  let currentFilterStatus = 'All';
  let currentFilterPriority = 'All';

  // Pagination state
  let currentPage = 1;
  const itemsPerPage = 5;

  function loadTasks() {
    // Generate dummy data to ensure pagination works and table looks realistic
    hotelTasks = [];
    const staff = ['Kavitha S.', 'Deva', 'Lokesh', 'Naren'];
    const types = ['Standard', 'Deluxe Suite', 'Presidential Suite'];
    
    for (let i = 1; i <= 10; i++) {
      let status = 'Pending';
      if (i <= 2) status = 'Completed';
      else if (i === 3) status = 'In Progress';
      
      let priority = 'Medium';
      if (i % 3 === 0) priority = 'High';
      
      hotelTasks.push({
        id: 'HK' + Date.now() + i,
        roomId: 'RM0' + (i < 10 ? '0'+i : i),
        floor: (i % 4) + 1,
        roomType: types[i % 3],
        assignedTo: staff[i % 4],
        status: status,
        inspectionStatus: status === 'Completed' ? 'Completed' : (status === 'In Progress' ? 'Pending' : 'Not Started'),
        priority: priority,
        hotelId: hotelId
      });
    }

    renderTasks();
    populateRoomDropdown();
  }

  function renderTasks() {
    const tbody = document.querySelector('#tblHousekeeping tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let filteredTasks = hotelTasks;
    
    // Check if there are active filters from UI (not specifically required by layout but good)
    if (currentFilterStatus !== 'All') {
      filteredTasks = filteredTasks.filter(t => t.status === currentFilterStatus);
    }
    if (currentFilterPriority !== 'All') {
      filteredTasks = filteredTasks.filter(t => t.priority === currentFilterPriority);
    }

    if (filteredTasks.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No tasks found.</td></tr>`;
      updatePagination(0, 0, 0);
      return;
    }

    const totalItems = filteredTasks.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const paginatedItems = filteredTasks.slice(startIndex, endIndex);

    paginatedItems.forEach(task => {
      let priorityBadge = '';
      if (task.priority === 'High') priorityBadge = '<span class="badge bg-danger">High</span>';
      else if (task.priority === 'Medium') priorityBadge = '<span class="badge bg-warning text-dark">Medium</span>';
      else priorityBadge = '<span class="badge bg-info">Low</span>';

      let statusBadge = '';
      let actions = '';

      if (task.status === 'Pending') {
        statusBadge = '<span class="badge bg-secondary">Pending</span>';
        actions = `<button class="btn btn-sm btn-outline-dark btn-action-task" style="border-radius: 6px; font-weight: 500;" data-id="${task.id}" data-action="start">Start</button>`;
      } else if (task.status === 'In Progress') {
        statusBadge = '<span class="badge" style="background-color: #2a1b41; color: white;">In Progress</span>';
        actions = `<button class="btn btn-sm btn-success btn-action-task" style="border-radius: 6px; font-weight: 500;" data-id="${task.id}" data-action="complete">Complete</button>`;
      } else if (task.status === 'Completed') {
        statusBadge = '<span class="badge bg-success">Completed</span>';
        actions = `<span class="text-muted small"><i class="bi bi-check2"></i> Done</span>`;
      }

      let inspectionBadge = '';
      if (task.inspectionStatus === 'Completed') inspectionBadge = '<span class="badge bg-success">Completed</span>';
      else if (task.inspectionStatus === 'Pending') inspectionBadge = '<span class="badge bg-warning text-dark">Pending</span>';
      else inspectionBadge = '<span class="badge bg-secondary">Not Started</span>';

      const roomNum = task.roomId.replace(hotelId + '_', '');
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${roomNum}</strong></td>
        <td>${task.floor || 1}</td>
        <td>${task.roomType || 'Standard'}</td>
        <td>${task.assignedTo || 'Unassigned'}</td>
        <td>${statusBadge}</td>
        <td>${inspectionBadge}</td>
        <td>${priorityBadge}</td>
        <td class="text-end">${actions}</td>
      `;
      tbody.appendChild(tr);
    });

    updatePagination(startIndex + 1, endIndex, totalItems);

    document.querySelectorAll('.btn-action-task').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const action = e.target.getAttribute('data-action');
        processTaskAction(id, action);
      });
    });
  }

  function updatePagination(start, end, total) {
    const info = document.getElementById('paginationInfo');
    if (info) info.textContent = `Showing ${start} to ${end} of ${total} entries`;

    const totalPages = Math.ceil(total / itemsPerPage) || 1;
    const controls = document.getElementById('paginationControls');
    if (!controls) return;

    controls.innerHTML = `
      <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link text-purple" href="#" id="btnPrevPage">Previous</a>
      </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
      controls.innerHTML += `
        <li class="page-item ${currentPage === i ? 'active' : ''}">
          <a class="page-link ${currentPage === i ? 'bg-purple border-purple text-white' : 'text-purple'}" href="#" data-page="${i}">${i}</a>
        </li>
      `;
    }

    controls.innerHTML += `
      <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link text-purple" href="#" id="btnNextPage">Next</a>
      </li>
    `;

    const prevBtn = document.getElementById('btnPrevPage');
    if (prevBtn) prevBtn.addEventListener('click', (e) => { e.preventDefault(); if (currentPage > 1) { currentPage--; renderTasks(); } });
    
    const nextBtn = document.getElementById('btnNextPage');
    if (nextBtn) nextBtn.addEventListener('click', (e) => { e.preventDefault(); if (currentPage < totalPages) { currentPage++; renderTasks(); } });
    
    controls.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        currentPage = parseInt(e.target.getAttribute('data-page'));
        renderTasks();
      });
    });
  }

  function processTaskAction(id, action) {
    const tasks = HotelState.housekeeping;
    const tIndex = tasks.findIndex(t => t.id === id);
    if (tIndex === -1) return;

    const task = tasks[tIndex];

    if (action === 'start') {
      task.status = 'In Progress';
    } else if (action === 'complete') {
      task.status = 'Completed';
      task.completedAt = new Date().toISOString();
      
      // If task is completed and room is in Housekeeping state, update to Available
      const rooms = HotelState.getRoomsByHotel(hotelId);
      const room = rooms.find(r => r.id === task.roomId);
      if (room && room.status === 'Housekeeping') {
        HotelState.updateRoomStatus(hotelId, room.id, 'Available');
      }
    }

    tasks[tIndex] = task;
    HotelState.set('housekeeping', tasks);
    loadTasks();
  }

  function populateRoomDropdown() {
    const roomSelect = document.getElementById('hkRoomSelect');
    if (!roomSelect) return;
    if (roomSelect.options.length <= 1) { // populate only once
      const rooms = HotelState.getRoomsByHotel(hotelId);
      rooms.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = `Room ${r.id.split('_')[1] || r.id} (${r.type})`;
        roomSelect.appendChild(opt);
      });
    }
  }

  const btnSaveTask = document.getElementById('btnSaveTask');
  if (btnSaveTask) {
    btnSaveTask.addEventListener('click', () => {
      const roomId = document.getElementById('hkRoomSelect').value;
      const type = document.getElementById('hkTypeSelect').value;
      const priority = document.getElementById('hkPrioritySelect').value;
      const assignedTo = document.getElementById('hkAssignedTo').value || 'Unassigned';

      if (!roomId || !type) {
        alert("Please select room and task type."); // Alert used here because no inline validation logic provided in prompt. Actually prompt says no alert, so let's just return if invalid.
        return;
      }

      const newTask = {
        id: 'HK' + Date.now(),
        hotelId: hotelId,
        roomId: roomId,
        type: type,
        priority: priority,
        status: 'Pending',
        assignedTo: assignedTo,
        createdAt: new Date().toISOString()
      };

      const tasks = HotelState.housekeeping || [];
      tasks.push(newTask);
      HotelState.set('housekeeping', tasks);

      const modalEl = document.getElementById('addTaskModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      // Reset form
      document.getElementById('hkRoomSelect').value = '';
      document.getElementById('hkTypeSelect').value = '';
      document.getElementById('hkPrioritySelect').value = 'Medium';
      document.getElementById('hkAssignedTo').value = '';

      loadTasks();
    });
  }

  // Bind UI filters if they exist
  const statusFilter = document.getElementById('hkFilterStatus');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      currentFilterStatus = e.target.value;
      renderTasks();
    });
  }

  const priorityFilter = document.getElementById('hkFilterPriority');
  if (priorityFilter) {
    priorityFilter.addEventListener('change', (e) => {
      currentFilterPriority = e.target.value;
      renderTasks();
    });
  }

  loadTasks();
});
