document.addEventListener('DOMContentLoaded', () => {
  let cleaningQueue = [
    { room: '102', floor: '1st Floor', type: 'Standard Room', staff: 'Ramesh Kumar', status: 'Cleaning', inspection: 'Pending', priority: 'Medium' },
    { room: '108', floor: '1st Floor', type: 'Standard Room', staff: 'Unassigned', status: 'Dirty', inspection: 'Pending', priority: 'High' }
  ];

  const tblBody = document.querySelector('#tblHousekeeping tbody');
  const assignModal = new bootstrap.Modal(document.getElementById('assignStaffModal'));
  let activeRoomNum = null;

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
    
    if (cleaningQueue.length === 0) {
      tblBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">All rooms cleaned. No tasks in queue.</td></tr>`;
      return;
    }

    cleaningQueue.forEach(item => {
      let statusBadge = '';
      if (item.status === 'Dirty') statusBadge = '<span class="badge bg-danger">Dirty (Pending)</span>';
      else if (item.status === 'Cleaning') statusBadge = '<span class="badge bg-warning text-dark">Cleaning In Progress</span>';
      else statusBadge = '<span class="badge bg-success">Completed</span>';

      let priorityBadge = '';
      if (item.priority === 'High') priorityBadge = '<span class="badge bg-danger bg-opacity-10 text-danger">High</span>';
      else priorityBadge = '<span class="badge bg-secondary bg-opacity-10 text-secondary">Medium</span>';

      let actions = '';
      if (item.status === 'Dirty') {
        actions += `<button class="btn btn-outline-purple btn-sm py-0 px-2 me-1" onclick="openAssignModal('${item.room}')">Assign Staff</button>`;
      } else if (item.status === 'Cleaning') {
        actions += `<button class="btn btn-purple btn-sm py-0 px-2 me-1" onclick="finishCleaning('${item.room}')">Finish Clean</button>`;
      }

      if (item.inspection === 'Pending' && item.status === 'Completed') {
        actions += `<button class="btn btn-success btn-sm py-0 px-2" onclick="approveInspection('${item.room}')">Approve Inspect</button>`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>Room ${item.room}</strong></td>
        <td>${item.floor}</td>
        <td>${item.type}</td>
        <td>${item.staff}</td>
        <td>${statusBadge}</td>
        <td><span class="badge bg-light text-dark border">${item.inspection}</span></td>
        <td>${priorityBadge}</td>
        <td class="text-end text-nowrap">${actions}</td>
      `;
      tblBody.appendChild(tr);
    });

    // Update KPI badges
    document.getElementById('kpiDirty').textContent = cleaningQueue.filter(x => x.status === 'Dirty').length;
    document.getElementById('kpiInProgress').textContent = cleaningQueue.filter(x => x.status === 'Cleaning').length;
    document.getElementById('kpiInspections').textContent = cleaningQueue.filter(x => x.status === 'Completed' && x.inspection === 'Pending').length;
  }

  window.openAssignModal = function(room) {
    activeRoomNum = room;
    assignModal.show();
  };

  document.getElementById('btnConfirmAssign').addEventListener('click', () => {
    const staff = document.getElementById('selStaffMember').value;
    const item = cleaningQueue.find(x => x.room === activeRoomNum);
    if (item) {
      item.staff = staff;
      item.status = 'Cleaning';
      assignModal.hide();
      showToast(`Housekeeper assigned to Room ${item.room}. Shift updated.`, true);
      renderTable();
    }
  });

  window.finishCleaning = function(room) {
    const item = cleaningQueue.find(x => x.room === room);
    if (item) {
      item.status = 'Completed';
      item.inspection = 'Pending';
      showToast(`Cleaning completed for Room ${item.room}. Flagged for manager inspection.`, true);
      renderTable();
    }
  };

  window.approveInspection = function(room) {
    const idx = cleaningQueue.findIndex(x => x.room === room);
    if (idx !== -1) {
      cleaningQueue.splice(idx, 1);
      showToast(`Room ${room} passed inspection. Marked Available in master inventory.`, true);
      renderTable();
    }
  };

  renderTable();
});
