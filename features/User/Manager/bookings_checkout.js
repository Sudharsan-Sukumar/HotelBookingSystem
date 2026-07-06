document.addEventListener('DOMContentLoaded', () => {
  let departures = [
    { id: 'EE-2026-9042', guest: 'Ramesh Krishnan', room: '108', type: 'Standard Room', balance: 0, status: 'Checked In' },
    { id: 'EE-2026-9812', guest: 'Amit Patel', room: '302', type: 'Deluxe Suite', balance: 1500, status: 'Checked In' }
  ];

  let completedDepartures = [];

  const tblBody = document.querySelector('#tblCheckout tbody');
  const checkoutModal = new bootstrap.Modal(document.getElementById('checkoutWizardModal'));
  let activeCheckoutId = null;

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
    
    let list = [...departures, ...completedDepartures];
    if (list.length === 0) {
      tblBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No departures listed for today.</td></tr>`;
      return;
    }

    list.forEach(item => {
      const isCompleted = item.status === 'Completed';
      const actionBtn = isCompleted 
        ? `<span class="badge bg-success"><i class="bi bi-check-circle"></i> Settle Finished</span>` 
        : `<button class="btn btn-purple btn-sm py-1 px-3" onclick="openCheckoutDesk('${item.id}')">Audit & Settle</button>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${item.id}</strong></td>
        <td>${item.guest}</td>
        <td>Room ${item.room} <span class="text-muted d-block small" style="font-size: 0.65rem;">${item.type}</span></td>
        <td class="fw-bold">₹${item.balance.toLocaleString('en-IN')}</td>
        <td><span class="badge ${isCompleted ? 'bg-secondary' : 'bg-info'}">${item.status}</span></td>
        <td class="text-end">${actionBtn}</td>
      `;
      tblBody.appendChild(tr);
    });
  }

  window.openCheckoutDesk = function(id) {
    const item = departures.find(x => x.id === id);
    if (!item) return;
    activeCheckoutId = id;
    document.getElementById('checkoutOutstandingText').textContent = `₹${item.balance.toLocaleString('en-IN')}`;
    document.getElementById('chargeMinibar').value = 0;
    document.getElementById('chargeDamage').value = 0;
    checkoutModal.show();
  };

  document.getElementById('btnSubmitCheckout').addEventListener('click', () => {
    const item = departures.find(x => x.id === activeCheckoutId);
    if (item) {
      const minibar = parseFloat(document.getElementById('chargeMinibar').value) || 0;
      const damage = parseFloat(document.getElementById('chargeDamage').value) || 0;
      
      const totalCharge = item.balance + minibar + damage;

      // Settle
      const idx = departures.findIndex(x => x.id === activeCheckoutId);
      departures.splice(idx, 1);
      item.status = 'Completed';
      item.balance = 0;
      completedDepartures.push(item);

      // Update KPIs
      document.getElementById('kpiCompleted').textContent = completedDepartures.length;
      document.getElementById('kpiPendingCheckout').textContent = departures.length;

      checkoutModal.hide();
      showToast(`Billing account settled for ${item.guest}. Room status updated to Housekeeping.`, true);
      renderTable();
    }
  });

  renderTable();
});
