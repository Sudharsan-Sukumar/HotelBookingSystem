document.addEventListener('DOMContentLoaded', () => {
  let pendingCheckins = [
    { id: 'EE-2026-9841', guest: 'Arjun Mehta', room: '304', type: 'Deluxe Suite', branch: 'Elegant Enclave Chennai', guests: 2, time: '12:00 PM', status: 'Confirmed' },
    { id: 'EE-2026-8911', guest: 'Sarah Jenkins', room: '201', type: 'Executive Studio', branch: 'Elegant Enclave Chennai', guests: 2, time: '02:00 PM', status: 'Confirmed' },
    { id: 'EE-2026-9730', guest: 'Priya Sharma', room: '501', type: 'Penthouse Suite', branch: 'Elegant Enclave Chennai', guests: 4, time: '03:30 PM', status: 'Confirmed' }
  ];

  let completedCheckins = [];

  const tblBody = document.querySelector('#tblCheckin tbody');
  const searchInput = document.getElementById('checkinSearch');
  const roomInput = document.getElementById('checkinRoom');
  const branchSelect = document.getElementById('checkinBranch');
  const btnApply = document.getElementById('btnApplyCheckinFilters');

  const checkinModal = new bootstrap.Modal(document.getElementById('checkinWizardModal'));
  let activeCheckinId = null;

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
    const q = searchInput.value.toLowerCase().trim();
    const r = roomInput.value.trim();
    const b = branchSelect.value;

    let displayList = [...pendingCheckins, ...completedCheckins].filter(x => {
      if (q && !x.guest.toLowerCase().includes(q) && !x.id.toLowerCase().includes(q)) return false;
      if (r && x.room !== r) return false;
      if (b !== 'all' && !x.branch.includes(b)) return false;
      return true;
    });

    if (displayList.length === 0) {
      tblBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No arrivals pending search criteria.</td></tr>`;
      return;
    }

    displayList.forEach(item => {
      const isCompleted = item.status === 'Checked In';
      const actionBtn = isCompleted 
        ? `<span class="badge bg-success"><i class="bi bi-check2-all"></i> Checked In</span>` 
        : `<button class="btn btn-purple btn-sm py-1 px-3" onclick="openCheckinDesk('${item.id}')">Verify & Check-in</button>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${item.id}</strong></td>
        <td>${item.guest}</td>
        <td>Room ${item.room} <span class="text-muted d-block small" style="font-size: 0.65rem;">${item.type}</span></td>
        <td>${item.time}</td>
        <td>${item.guests} Adults</td>
        <td><span class="badge ${isCompleted ? 'bg-info' : 'bg-warning'} text-dark">${item.status}</span></td>
        <td class="text-end">${actionBtn}</td>
      `;
      tblBody.appendChild(tr);
    });
  }

  window.openCheckinDesk = function(id) {
    const item = pendingCheckins.find(x => x.id === id);
    if (!item) return;
    activeCheckinId = id;
    document.getElementById('checkinAssignedRoom').value = `Room ${item.room} (${item.type})`;
    document.getElementById('checkinDocId').value = '';
    document.getElementById('checkinSecurityCollected').checked = false;
    checkinModal.show();
  };

  document.getElementById('btnSubmitCheckin').addEventListener('click', () => {
    const docId = document.getElementById('checkinDocId').value.trim();
    const security = document.getElementById('checkinSecurityCollected').checked;

    if (!docId) {
      showToast("Verification document number is required.", false);
      return;
    }
    if (!security) {
      showToast("Security deposit collection must be verified.", false);
      return;
    }

    const idx = pendingCheckins.findIndex(x => x.id === activeCheckinId);
    if (idx !== -1) {
      const item = pendingCheckins.splice(idx, 1)[0];
      item.status = 'Checked In';
      completedCheckins.push(item);

      // Update KPIs
      document.getElementById('kpiCheckedin').textContent = completedCheckins.length;
      document.getElementById('kpiPending').textContent = pendingCheckins.length;

      checkinModal.hide();
      showToast(`Guest check-in process completed for room ${item.room}. Keycard activated.`, true);
      renderTable();
    }
  });

  btnApply.addEventListener('click', renderTable);
  renderTable();
});
