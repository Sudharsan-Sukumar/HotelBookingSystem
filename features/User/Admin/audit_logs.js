document.addEventListener('DOMContentLoaded', () => {
  let logs = [
    { timestamp: '24 Jun 2026, 10:30:15 AM', user: 'Suresh Patel', role: 'Manager', module: 'Bookings', action: 'Approved booking HBS-2026-002', result: 'Success' },
    { timestamp: '24 Jun 2026, 10:15:42 AM', user: 'System Admin', role: 'Admin', module: 'Users', action: 'Deactivated user CUST-006', result: 'Success' },
    { timestamp: '24 Jun 2026, 09:50:20 AM', user: 'Priya Sharma', role: 'Manager', module: 'Rooms', action: 'Updated room price - Deluxe 305', result: 'Success' },
    { timestamp: '24 Jun 2026, 09:30:11 AM', user: 'System Admin', role: 'Admin', module: 'Hotels', action: 'Added hotel Chennai branch', result: 'Success' },
    { timestamp: '24 Jun 2026, 09:20:05 AM', user: 'Rajesh Kumar', role: 'Customer', module: 'Profile', action: 'Updated phone number', result: 'Success' },
    { timestamp: '24 Jun 2026, 08:55:48 AM', user: 'MGR-013', role: 'Manager', module: 'Login', action: 'Failed login attempt (wrong password)', result: 'Failed' }
  ];

  const tblBody = document.querySelector('#tblAuditLogs tbody');
  const filterUser = document.getElementById('filterUser');
  const filterModule = document.getElementById('filterModule');

  function showToast(message, isSuccess = true) {
    const toastMessage = document.getElementById('toastMessage');
    const toastEl = document.getElementById('statusToast');
    toastEl.className = `toast align-items-center text-white border-0 shadow ${isSuccess ? 'bg-success' : 'bg-danger'}`;
    toastMessage.textContent = message;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }

  const filterDate = document.getElementById('filterDate');
  const btnApply = document.getElementById('btnApplyFilters');
  const btnReset = document.getElementById('btnResetFilters');

  function renderTable() {
    tblBody.innerHTML = '';
    const userVal = filterUser.value;
    const moduleVal = filterModule.value;
    const dateVal = filterDate ? filterDate.value : 'all';

    let filtered = logs.filter(l => {
      if (userVal !== 'all' && l.role !== userVal) return false;
      if (moduleVal !== 'all' && l.module !== moduleVal) return false;
      if (dateVal === 'Today') {
        const isToday = l.timestamp.toLowerCase().includes('today') || l.timestamp.includes('24 Jun 2026');
        if (!isToday) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      tblBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No audit logs found. Try changing your filters.</td></tr>`;
      return;
    }

    filtered.forEach(l => {
      let badgeClass = 'bg-success';
      if (l.result === 'Failed') badgeClass = 'bg-danger';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${l.timestamp}</td>
        <td><strong>${l.user}</strong></td>
        <td><span class="badge bg-secondary-light text-secondary">${l.role}</span></td>
        <td>${l.module}</td>
        <td>${l.action}</td>
        <td><span class="badge ${badgeClass}">${l.result}</span></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-purple py-0 px-2" onclick="location.href='view_audit.html?id=123'"><i class="bi bi-eye-fill me-1"></i>View</button>
        </td>
      `;
      tblBody.appendChild(tr);
    });
  }

  window.exportAudit = function(format) {
    showToast(`Audit logs exported successfully in ${format} format.`, true);
    
    let content = '';
    let mimeType = 'text/plain';
    let filename = `Audit_Logs_${new Date().toISOString().slice(0,10)}.${format === 'Excel' ? 'xlsx' : 'txt'}`;

    if (format === 'Excel') {
      content = 'XML/Binary Data Excel Stub';
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      content = '=== ELEGANT ENCLAVE SYSTEM AUDIT LOGS ===\n\n' +
                `Generated on: ${new Date().toLocaleString()}\n` +
                '----------------------------------------\n\n' +
                logs.map(l => `Timestamp: ${l.timestamp}\nUser: ${l.user}\nRole: ${l.role}\nModule: ${l.module}\nAction: ${l.action}\nResult: ${l.result}\n----------------------------------------`).join('\n\n');
      mimeType = 'text/plain';
    }

    // Trigger file download helper
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Bind actions
  if (btnApply) {
    btnApply.addEventListener('click', renderTable);
  }
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      filterUser.value = 'all';
      filterModule.value = 'all';
      if (filterDate) filterDate.value = 'all';
      renderTable();
    });
  }

  // Live polling every 30 seconds
  setInterval(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    logs.unshift({
      timestamp: dateStr,
      user: 'System Admin',
      role: 'Admin',
      module: 'Backup',
      action: 'Automatic database checksum verification succeeded',
      result: 'Success'
    });

    showToast('New system activity logged.', true);
    renderTable();
  }, 30000);

  renderTable();
});
