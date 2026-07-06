document.addEventListener('DOMContentLoaded', () => {
  let users = [
    { id: 'CUST-001', name: 'Rajesh Kumar', email: 'rajesh.k@email.com', role: 'Customer', branch: 'N/A', status: 'Active', login: '29 Jun 2026, 10:15 AM' },
    { id: 'MGR-001', name: 'Suresh Patel', email: 'suresh.p@ehbs.com', role: 'Manager', branch: 'Salem', status: 'Active', login: '29 Jun 2026, 09:40 AM' },
    { id: 'MGR-002', name: 'Priya Sharma', email: 'priya.s@ehbs.com', role: 'Manager', branch: 'Coimbatore', status: 'Active', login: '29 Jun 2026, 08:55 AM' },
    { id: 'CUST-002', name: 'Arun Menon', email: 'arun.m@email.com', role: 'Customer', branch: 'N/A', status: 'Active', login: '28 Jun 2026, 07:30 PM' },
    { id: 'MGR-013', name: 'Gita Reddy', email: 'gita.r@ehbs.com', role: 'Manager', branch: 'Chennai', status: 'Pending', login: '-' },
    { id: 'CUST-006', name: 'Kavya Reddy', email: 'kavya.r@email.com', role: 'Customer', branch: 'N/A', status: 'Inactive', login: '25 Jun 2026, 11:20 AM' },
    { id: 'CUST-007', name: 'Mohan Verma', email: 'mohan.v@email.com', role: 'Customer', branch: 'N/A', status: 'Active', login: '28 Jun 2026, 06:10 PM' }
  ];

  const tblBody = document.querySelector('#tblUsers tbody');
  const userSearch = document.getElementById('userSearch');
  const roleFilter = document.getElementById('userRoleFilter');
  const statusFilter = document.getElementById('userStatusFilter');
  const branchFilter = document.getElementById('userBranchFilter');
  const btnReset = document.getElementById('btnResetFilters');
  const btnApply = document.getElementById('btnApplyFilters');
  const tabs = document.querySelectorAll('#userTabs .nav-link');

  let activeTab = 'all';

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
    const q = userSearch.value.toLowerCase().trim();
    const roleVal = roleFilter.value;
    const statusVal = statusFilter.value;
    const branchVal = branchFilter.value;

    let filtered = users.filter(u => {
      // Tab Category checks
      if (activeTab === 'Customer' && u.role !== 'Customer') return false;
      if (activeTab === 'Manager' && u.role !== 'Manager') return false;
      if (activeTab === 'Pending' && u.status !== 'Pending') return false;

      // Filter settings
      if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !u.id.toLowerCase().includes(q)) return false;
      if (roleVal !== 'all' && u.role !== roleVal) return false;
      if (statusVal !== 'all' && u.status !== statusVal) return false;
      if (branchVal !== 'all' && u.branch !== branchVal) return false;
      return true;
    });

    // Update KPI summary cards
    document.getElementById('kpiTotal').textContent = users.length;
    document.getElementById('kpiCustomers').textContent = users.filter(x => x.role === 'Customer').length;
    document.getElementById('kpiManagers').textContent = users.filter(x => x.role === 'Manager').length;
    document.getElementById('kpiAdmins').textContent = users.filter(x => x.role === 'Admin').length;
    document.getElementById('kpiPending').textContent = users.filter(x => x.status === 'Pending').length;

    if (filtered.length === 0) {
      tblBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No users found matching current criteria.</td></tr>`;
      return;
    }

    filtered.forEach(u => {
      let roleBadge = '';
      if (u.role === 'Customer') roleBadge = '<span class="badge bg-primary bg-opacity-10 text-primary">Customer</span>';
      else if (u.role === 'Manager') roleBadge = '<span class="badge bg-success bg-opacity-10 text-success">Manager</span>';
      else roleBadge = '<span class="badge bg-info bg-opacity-10 text-info">Administrator</span>';

      let statusBadge = '';
      if (u.status === 'Active') statusBadge = '<span class="badge bg-success">Active</span>';
      else if (u.status === 'Pending') statusBadge = '<span class="badge bg-warning text-dark">Pending</span>';
      else if (u.status === 'Inactive') statusBadge = '<span class="badge bg-secondary">Inactive</span>';
      else statusBadge = '<span class="badge bg-danger">Blocked</span>';

      let actions = '';
      if (u.status === 'Pending') {
        actions += `
          <button class="btn btn-sm btn-outline-success py-0 px-2 me-1" onclick="approveUser('${u.id}')">Approve</button>
          <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="rejectUser('${u.id}')">Reject</button>
        `;
      } else {
        actions += `
          <button class="btn btn-sm btn-outline-purple py-0 px-2 me-1" onclick="location.href='view_user.html?id=${u.id}'"><i class="bi bi-eye-fill me-1"></i>View</button>
        `;
        if (u.role === 'Manager') {
          actions += `
            <button class="btn btn-sm btn-outline-purple py-0 px-2 me-1" onclick="location.href='edit_manager.html?id=${u.id}'"><i class="bi bi-pencil-fill me-1"></i>Edit</button>
          `;
        }
        actions += `
          <button class="btn btn-sm btn-outline-purple py-0 px-2 me-1" onclick="resetPassword('${u.id}')">Reset PW</button>
          <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deleteUser('${u.id}')">Delete</button>
        `;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${u.id}</strong></td>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>${roleBadge}</td>
        <td>${u.branch}</td>
        <td>${statusBadge}</td>
        <td>${u.login}</td>
        <td class="text-end text-nowrap">${actions}</td>
      `;
      tblBody.appendChild(tr);
    });
  }

  window.approveUser = function(id) {
    const u = users.find(x => x.id === id);
    if (u) {
      u.status = 'Active';
      showToast(`User ${u.name} has been approved and activated.`, true);
      renderTable();
    }
  };

  window.rejectUser = function(id) {
    const idx = users.findIndex(x => x.id === id);
    if (idx !== -1) {
      users.splice(idx, 1);
      showToast(`Pending user registration rejected.`, false);
      renderTable();
    }
  };

  window.resetPassword = function(id) {
    const u = users.find(x => x.id === id);
    if (u) {
      showToast(`Temporary password generated and dispatched to ${u.email}`, true);
    }
  };

  window.deleteUser = function(id) {
    if (confirm('Are you sure you want to delete this user credentials profile?')) {
      const idx = users.findIndex(x => x.id === id);
      if (idx !== -1) {
        users.splice(idx, 1);
        showToast('User deleted from system records.', true);
        renderTable();
      }
    }
  };

  // Tab switcher
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.getAttribute('data-tab');
      renderTable();
    });
  });

  // Filter actions
  btnApply.addEventListener('click', renderTable);
  btnReset.addEventListener('click', () => {
    userSearch.value = '';
    roleFilter.value = 'all';
    statusFilter.value = 'all';
    branchFilter.value = 'all';
    renderTable();
  });

  renderTable();
});
