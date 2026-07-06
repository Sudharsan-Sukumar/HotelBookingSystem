document.addEventListener('DOMContentLoaded', () => {
  let requests = [
    { id: 'REQ-2026-001', type: 'Booking Modification', bookingId: 'EE-2026-9841', guest: 'Arjun Mehta', branch: 'Chennai', created: '2026-07-01', priority: 'High', status: 'Pending', manager: 'Sridhar K.', notes: 'Change dates from 03-Jul to 05-Jul' },
    { id: 'REQ-2026-002', type: 'Cancellation', bookingId: 'EE-2026-7811', guest: 'Divya Nair', branch: 'Chennai', created: '2026-06-30', priority: 'Medium', status: 'Pending', manager: 'Sridhar K.', notes: 'Immediate flight cancellation refund request' },
    { id: 'REQ-2026-003', type: 'Refund', bookingId: 'EE-2026-7811', guest: 'Divya Nair', branch: 'Chennai', created: '2026-06-30', priority: 'Medium', status: 'Pending', manager: 'Unassigned', notes: 'Collect 100% refund as cancellation was done 72h prior check-in' },
    { id: 'REQ-2026-004', type: 'General Request', bookingId: 'EE-2026-8911', guest: 'Sarah Jenkins', branch: 'Chennai', created: '2026-07-02', priority: 'Low', status: 'Pending', manager: 'Sridhar K.', notes: 'Request extra crib for infant' },
    { id: 'REQ-2026-005', type: 'Booking Modification', bookingId: 'EE-2026-9812', guest: 'Amit Patel', branch: 'Chennai', created: '2026-07-01', priority: 'High', status: 'Pending', manager: 'Sridhar K.', notes: 'Upgrade Deluxe room assignment to Executive Suite' },
    { id: 'REQ-2026-006', type: 'Cancellation', bookingId: 'EE-2026-9102', guest: 'Srinivas Murthy', branch: 'Chennai', created: '2026-06-28', priority: 'Low', status: 'Completed', manager: 'Sridhar K.', notes: 'Guest requested early cancellation due to schedule conflict' }
  ];

  const tblBody = document.querySelector('#tblRequests tbody');
  const searchInput = document.getElementById('reqSearch');
  const categorySelect = document.getElementById('reqCategory');
  const statusSelect = document.getElementById('reqStatus');
  const branchSelect = document.getElementById('reqBranch');
  const prioritySelect = document.getElementById('reqPriority');
  const btnReset = document.getElementById('btnResetReqFilters');

  const processModal = new bootstrap.Modal(document.getElementById('processRequestModal'));
  const modalTitle = document.getElementById('reqModalTitle');
  const modalBody = document.getElementById('reqModalBody');
  const btnConfirm = document.getElementById('btnConfirmReqAction');

  let activeRequestId = null;
  let activeActionType = null; // 'approve', 'reject', 'refund'

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
    const cat = categorySelect.value;
    const stat = statusSelect.value;
    const br = branchSelect.value;
    const pr = prioritySelect.value;

    let filtered = requests.filter(x => {
      if (q && !x.id.toLowerCase().includes(q) && !x.bookingId.toLowerCase().includes(q) && !x.guest.toLowerCase().includes(q)) return false;
      if (cat !== 'all' && x.type !== cat) return false;
      if (stat !== 'all' && x.status !== stat) return false;
      if (br !== 'all' && !x.branch.includes(br)) return false;
      if (pr !== 'all' && x.priority !== pr) return false;
      return true;
    });

    // Update KPI Active badge
    document.getElementById('kpiActiveRequests').textContent = requests.filter(r => r.status === 'Pending').length;
    document.getElementById('badgeRequestsCount').textContent = requests.filter(r => r.status === 'Pending').length;

    if (filtered.length === 0) {
      tblBody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">No request elements found matching parameters.</td></tr>`;
      return;
    }

    filtered.forEach(r => {
      let badgeType = '';
      if (r.type === 'Booking Modification') badgeType = '<span class="badge bg-warning text-dark"><i class="bi bi-pencil-square me-1"></i> Booking Modification</span>';
      else if (r.type === 'Cancellation') badgeType = '<span class="badge bg-danger text-white"><i class="bi bi-x-circle me-1"></i> Cancellation</span>';
      else if (r.type === 'Refund') badgeType = '<span class="badge bg-success text-white"><i class="bi bi-currency-rupee me-1"></i> Refund</span>';
      else badgeType = '<span class="badge bg-info text-dark"><i class="bi bi-question-circle me-1"></i> General Request</span>';

      let priorityBadge = '';
      if (r.priority === 'High') priorityBadge = '<span class="badge bg-danger bg-opacity-10 text-danger badge-priority">High</span>';
      else if (r.priority === 'Medium') priorityBadge = '<span class="badge bg-warning bg-opacity-10 text-warning badge-priority">Medium</span>';
      else priorityBadge = '<span class="badge bg-secondary bg-opacity-10 text-secondary badge-priority">Low</span>';

      let statusBadge = '';
      if (r.status === 'Pending') statusBadge = '<span class="badge bg-warning-light text-warning rounded-pill px-2 py-1">Pending</span>';
      else if (r.status === 'Approved') statusBadge = '<span class="badge bg-success-light text-success rounded-pill px-2 py-1">Approved</span>';
      else if (r.status === 'Rejected') statusBadge = '<span class="badge bg-danger-light text-danger rounded-pill px-2 py-1">Rejected</span>';
      else statusBadge = '<span class="badge bg-secondary-light text-secondary rounded-pill px-2 py-1">Completed</span>';

      let actions = '';
      if (r.status === 'Pending') {
        if (r.type === 'Booking Modification') {
          actions += `<button class="btn btn-outline-purple btn-sm py-0 px-2 me-1" onclick="processRequest('${r.id}', 'approve')">Approve</button>`;
          actions += `<button class="btn btn-outline-danger btn-sm py-0 px-2" onclick="processRequest('${r.id}', 'reject')">Reject</button>`;
        } else if (r.type === 'Cancellation') {
          actions += `<button class="btn btn-danger btn-sm py-0 px-2" onclick="processRequest('${r.id}', 'approve')">Approve Cancellation</button>`;
        } else if (r.type === 'Refund') {
          actions += `<button class="btn btn-success btn-sm py-0 px-2" onclick="processRequest('${r.id}', 'refund')">Process Refund</button>`;
        } else {
          actions += `<button class="btn btn-purple btn-sm py-0 px-2" onclick="processRequest('${r.id}', 'complete')">Mark Resolved</button>`;
        }
      } else {
        actions += `<span class="small text-muted">No Action Required</span>`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${r.id}</strong></td>
        <td>${badgeType}</td>
        <td>${r.bookingId}</td>
        <td>${r.guest}</td>
        <td>${r.branch}</td>
        <td>${r.created}</td>
        <td>${priorityBadge}</td>
        <td>${statusBadge}</td>
        <td>${r.manager}</td>
        <td class="text-end text-nowrap">${actions}</td>
      `;
      tblBody.appendChild(tr);
    });
  }

  window.processRequest = function(id, action) {
    const r = requests.find(x => x.id === id);
    if (!r) return;
    activeRequestId = id;
    activeActionType = action;

    modalTitle.textContent = `${r.type} Request - ${r.id}`;

    if (action === 'approve') {
      modalBody.innerHTML = `
        <div class="small">
          <p><strong>Booking ID:</strong> ${r.bookingId}</p>
          <p><strong>Guest Name:</strong> ${r.guest}</p>
          <p><strong>Request Details:</strong> ${r.notes}</p>
          <hr class="my-2">
          <p class="mb-0 text-dark fw-medium">Are you sure you want to approve this request determination?</p>
        </div>
      `;
    } else if (action === 'reject') {
      modalBody.innerHTML = `
        <div class="small">
          <p><strong>Request Details:</strong> ${r.notes}</p>
          <div class="mb-2">
            <label class="form-label small fw-bold">Reason for Rejection</label>
            <textarea class="form-control form-control-sm" id="reqRejectReason" placeholder="Input reason..."></textarea>
          </div>
        </div>
      `;
    } else if (action === 'refund') {
      modalBody.innerHTML = `
        <div class="small">
          <p><strong>Booking ID:</strong> ${r.bookingId}</p>
          <p><strong>Policy Eligibility:</strong> 100% Refund (Verified: cancellation performed >48 hours prior check-in window).</p>
          <div class="p-2 bg-light rounded text-success fw-bold mb-2">
            Collect Refund Sum: ₹12,000
          </div>
        </div>
      `;
    } else {
      modalBody.innerHTML = `
        <div class="small">
          <p>Mark this general request resolution as resolved?</p>
        </div>
      `;
    }

    processModal.show();
  };

  btnConfirm.addEventListener('click', () => {
    const r = requests.find(x => x.id === activeRequestId);
    if (r) {
      if (activeActionType === 'approve') {
        r.status = 'Approved';
        showToast(`Request ${r.id} approved successfully.`);
      } else if (activeActionType === 'reject') {
        const reason = document.getElementById('reqRejectReason')?.value || '';
        r.status = 'Rejected';
        showToast(`Request ${r.id} rejected. Reason logged: ${reason}`);
      } else if (activeActionType === 'refund') {
        r.status = 'Completed';
        showToast(`Refund processed back to source account.`);
      } else {
        r.status = 'Completed';
        showToast(`General request resolution saved.`);
      }

      processModal.hide();
      renderTable();
    }
  });

  // Filter events
  searchInput.addEventListener('input', renderTable);
  categorySelect.addEventListener('change', renderTable);
  statusSelect.addEventListener('change', renderTable);
  branchSelect.addEventListener('change', renderTable);
  prioritySelect.addEventListener('change', renderTable);

  btnReset.addEventListener('click', () => {
    searchInput.value = '';
    categorySelect.value = 'all';
    statusSelect.value = 'all';
    branchSelect.value = 'all';
    prioritySelect.value = 'all';
    renderTable();
  });

  renderTable();
});
