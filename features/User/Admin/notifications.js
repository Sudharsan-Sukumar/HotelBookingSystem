document.addEventListener('DOMContentLoaded', () => {
  let notifications = [
    { id: 'NTF-001', module: 'Hotels', title: 'New Hotel Registration', desc: 'Hotel "Elegant Enclave Chennai" is waiting for approval.', date: '24 Jun 2026, 10:30 AM', priority: 'High', status: 'Unread', actionText: 'Review', recommendation: 'Verify branch address details and approve hotel registration requests.' },
    { id: 'NTF-002', module: 'Backup', title: 'Backup Completed Successfully', desc: 'Automatic backup completed successfully.', date: '24 Jun 2026, 05:00 AM', priority: 'Low', status: 'Read', actionText: 'View Backup', recommendation: 'No further actions required.' },
    { id: 'NTF-003', module: 'Bookings', title: 'Booking Modification Request', desc: 'Customer requested booking modification for Booking HBS-2026-002.', date: '23 Jun 2026, 04:12 PM', priority: 'Medium', status: 'Unread', actionText: 'Review Booking', recommendation: 'Check room type inventory constraints and modify booking dates.' },
    { id: 'NTF-004', module: 'Security', title: 'Multiple Failed Login Attempts', desc: '5 failed login attempts detected for Manager account.', date: '23 Jun 2026, 02:45 PM', priority: 'Critical', status: 'Unread', actionText: 'Investigate', recommendation: 'Temporarily lock account access and trigger password update request.' }
  ];

  const listContainer = document.getElementById('notifListContainer');
  const detailsPlaceholder = document.getElementById('detailsPlaceholder');
  const detailsContent = document.getElementById('detailsContent');
  const txtSearch = document.getElementById('txtSearchNotif');
  
  let selectedNotif = null;
  let activeCategory = 'All';

  function showToast(message, isSuccess = true) {
    const toastMessage = document.getElementById('toastMessage');
    const toastEl = document.getElementById('statusToast');
    toastEl.className = `toast align-items-center text-white border-0 shadow ${isSuccess ? 'bg-success' : 'bg-danger'}`;
    toastMessage.textContent = message;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }

  function renderList() {
    listContainer.innerHTML = '';
    const q = txtSearch.value.toLowerCase().trim();

    let filtered = notifications.filter(n => {
      if (activeCategory !== 'All' && n.module !== activeCategory) return false;
      if (q && !n.title.toLowerCase().includes(q) && !n.desc.toLowerCase().includes(q)) return false;
      return true;
    });

    // Update unread count metrics
    const unreadCount = notifications.filter(x => x.status === 'Unread').length;
    document.getElementById('kpiUnread').textContent = unreadCount;
    document.getElementById('navNotifCount').textContent = unreadCount;

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="card p-5 border bg-white shadow-sm text-center text-muted" style="border-radius: 12px;">
          <i class="bi bi-bell-slash fs-1 mb-2 d-block text-warning"></i>
          No notifications available.<br>You are all caught up.
        </div>
      `;
      return;
    }

    filtered.forEach(n => {
      let badgeClass = 'bg-primary';
      let borderLeftClass = 'notif-info';
      if (n.priority === 'Critical') {
        badgeClass = 'bg-danger';
        borderLeftClass = 'notif-critical';
      } else if (n.priority === 'High') {
        badgeClass = 'bg-warning text-dark';
        borderLeftClass = 'notif-high';
      } else if (n.priority === 'Medium') {
        badgeClass = 'bg-info text-dark';
        borderLeftClass = 'notif-medium';
      } else if (n.priority === 'Low') {
        badgeClass = 'bg-success';
        borderLeftClass = 'notif-low';
      }

      const card = document.createElement('div');
      card.className = `card p-3 border bg-white shadow-sm notif-card ${borderLeftClass} ${n.status === 'Unread' ? 'unread' : ''}`;
      if (selectedNotif && selectedNotif.id === n.id) {
        card.classList.add('active-selected');
      }

      card.innerHTML = `
        <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
          <div class="small fw-bold text-purple">${n.title}</div>
          <span class="badge ${badgeClass}" style="font-size: 0.6rem;">${n.priority}</span>
        </div>
        <div class="text-secondary small mb-2">${n.desc}</div>
        <div class="d-flex justify-content-between align-items-center">
          <span class="text-muted small" style="font-size: 0.65rem;">${n.date}</span>
          <button class="btn btn-outline-purple btn-sm py-0 px-2 small" onclick="event.stopPropagation(); viewDetails('${n.id}')">${n.actionText}</button>
        </div>
      `;

      card.addEventListener('click', () => {
        viewDetails(n.id);
        renderList();
      });

      listContainer.appendChild(card);
    });
  }

  window.viewDetails = function(id) {
    const n = notifications.find(x => x.id === id);
    if (!n) return;

    selectedNotif = n;
    detailsPlaceholder.classList.add('d-none');
    detailsContent.classList.remove('d-none');

    document.getElementById('detId').textContent = n.id;
    document.getElementById('detModule').textContent = n.module;
    document.getElementById('detDate').textContent = n.date;
    document.getElementById('detPriority').textContent = n.priority;
    document.getElementById('detStatus').textContent = n.status;
    document.getElementById('detDesc').textContent = n.desc;
    document.getElementById('detAction').textContent = n.recommendation;

    // Apply priority badge color in details
    let badgeClass = 'badge bg-primary';
    if (n.priority === 'Critical') badgeClass = 'badge bg-danger';
    else if (n.priority === 'High') badgeClass = 'badge bg-warning text-dark';
    else if (n.priority === 'Medium') badgeClass = 'badge bg-info text-dark';
    else if (n.priority === 'Low') badgeClass = 'badge bg-success';
    document.getElementById('detPriority').className = badgeClass;
  };

  // Set active category filter links
  window.setCategory = function(cat) {
    activeCategory = cat;
    document.querySelectorAll('.category-link').forEach(link => {
      link.classList.remove('active');
      if (link.querySelector('span').textContent.trim() === cat) {
        link.classList.add('active');
      }
    });
    renderList();
  };

  // Actions
  document.getElementById('btnMarkAllRead').addEventListener('click', () => {
    notifications.forEach(x => x.status = 'Read');
    showToast('All notifications marked as read.', true);
    renderList();
  });

  document.getElementById('btnClearRead').addEventListener('click', () => {
    notifications = notifications.filter(x => x.status === 'Unread');
    selectedNotif = null;
    detailsPlaceholder.classList.remove('d-none');
    detailsContent.classList.add('d-none');
    showToast('Read notifications cleared.', true);
    renderList();
  });

  document.getElementById('btnDetRead').addEventListener('click', () => {
    if (selectedNotif) {
      selectedNotif.status = 'Read';
      showToast('Notification marked as read.', true);
      viewDetails(selectedNotif.id);
      renderList();
    }
  });

  document.getElementById('btnDetDelete').addEventListener('click', () => {
    if (selectedNotif) {
      notifications = notifications.filter(x => x.id !== selectedNotif.id);
      selectedNotif = null;
      detailsPlaceholder.classList.remove('d-none');
      detailsContent.classList.add('d-none');
      showToast('Notification deleted.', true);
      renderList();
    }
  });

  txtSearch.addEventListener('input', renderList);

  // Simulated live update polling every 30 seconds
  setInterval(() => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    notifications.unshift({
      id: `NTF-00${notifications.length + 1}`,
      module: 'Bookings',
      title: 'Booking Cancelled',
      desc: 'Customer cancelled booking HBS-2026-015 in Salem.',
      date: dateStr,
      priority: 'Medium',
      status: 'Unread',
      actionText: 'Review Booking',
      recommendation: 'Check refund trigger logs and update room availability status.'
    });

    showToast('New system notification received.', true);
    renderList();
  }, 30000);

  renderList();
});
