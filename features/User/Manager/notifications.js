document.addEventListener('DOMContentLoaded', () => {
  // 1. Mock Notification Data Stream (18 items mapping to multiple category scopes)
  let notifications = [
    {
      id: 'NT-101',
      type: 'Booking Confirmed',
      category: 'bookings',
      description: 'Room 304 reserved successfully. Check-in on 03 July 2026.',
      bookingId: 'EE-2026-9841',
      guestName: 'Arjun Mehta',
      branch: 'Elegant Enclave Chennai',
      date: 'Today',
      time: '11:45 AM',
      priority: 'low',
      status: 'unread'
    },
    {
      id: 'NT-102',
      type: 'Booking Cancellation Request',
      category: 'cancellations',
      description: 'Cancellation requested for Booking EE-2026-8911 due to travel schedule change.',
      bookingId: 'EE-2026-8911',
      guestName: 'Sarah Jenkins',
      branch: 'Elegant Enclave Chennai',
      date: 'Today',
      time: '11:30 AM',
      priority: 'high',
      status: 'unread'
    },
    {
      id: 'NT-103',
      type: 'VIP Guest Arrival',
      category: 'checkins',
      description: 'VIP Gold Member arriving today. Prepare special welcome basket.',
      bookingId: 'EE-2026-9042',
      guestName: 'Ramesh Krishnan',
      branch: 'Elegant Enclave Chennai',
      date: 'Today',
      time: '10:15 AM',
      priority: 'high',
      status: 'unread'
    },
    {
      id: 'NT-104',
      type: 'Booking Modification Request',
      category: 'modifications',
      description: 'Guest requested date shift from 05-08 July to 07-10 July.',
      bookingId: 'EE-2026-9730',
      guestName: 'Priya Sharma',
      branch: 'Elegant Enclave Chennai',
      date: 'Today',
      time: '09:50 AM',
      priority: 'medium',
      status: 'unread'
    },
    {
      id: 'NT-105',
      type: 'Room Maintenance Request',
      category: 'maintenance',
      description: 'AC water leakage reported in Room 412. Maintenance required.',
      bookingId: '',
      guestName: '',
      branch: 'Elegant Enclave Chennai',
      date: 'Today',
      time: '09:12 AM',
      priority: 'medium',
      status: 'unread'
    },
    {
      id: 'NT-106',
      type: 'Payment Successful',
      category: 'payments',
      description: 'Payment of ₹15,400 captured successfully for Invoice #INV-89102.',
      bookingId: 'EE-2026-9812',
      guestName: 'Amit Patel',
      branch: 'Elegant Enclave Chennai',
      date: 'Today',
      time: '08:45 AM',
      priority: 'low',
      status: 'unread'
    },
    {
      id: 'NT-107',
      type: 'Guest Checked In',
      category: 'checkins',
      description: 'Guest Sridhar Kumar checked into Room 204.',
      bookingId: 'EE-2026-9400',
      guestName: 'Sridhar Kumar',
      branch: 'Elegant Enclave Chennai',
      date: 'Today',
      time: '08:10 AM',
      priority: 'low',
      status: 'read'
    },
    {
      id: 'NT-108',
      type: 'Refund Request',
      category: 'refunds',
      description: 'Refund request of ₹6,500 submitted for cancelled stay EE-2026-7811.',
      bookingId: 'EE-2026-7811',
      guestName: 'Divya Nair',
      branch: 'Elegant Enclave Chennai',
      date: 'Today',
      time: '07:30 AM',
      priority: 'high',
      status: 'unread'
    },
    {
      id: 'NT-109',
      type: 'Guest Complaint',
      category: 'messages',
      description: 'Complaint submitted regarding hot water delay in bathroom 108.',
      bookingId: '',
      guestName: 'John Doe',
      branch: 'Elegant Enclave Chennai',
      date: 'Today',
      time: '06:15 AM',
      priority: 'medium',
      status: 'unread'
    },
    {
      id: 'NT-110',
      type: 'Payment Failed',
      category: 'payments',
      description: 'UPI transaction failed for Booking EE-2026-9321. Insufficient balance.',
      bookingId: 'EE-2026-9321',
      guestName: 'Vikram Singh',
      branch: 'Elegant Enclave Chennai',
      date: 'Yesterday',
      time: '09:40 PM',
      priority: 'medium',
      status: 'unread'
    },
    {
      id: 'NT-111',
      type: 'Guest Checked Out',
      category: 'checkouts',
      description: 'Guest Checked out of Room 311. Housekeeping notified.',
      bookingId: 'EE-2026-9102',
      guestName: 'Srinivas Murthy',
      branch: 'Elegant Enclave Chennai',
      date: 'Yesterday',
      time: '11:30 AM',
      priority: 'low',
      status: 'read'
    },
    {
      id: 'NT-112',
      type: 'Low Room Availability',
      category: 'bookings',
      description: 'Standard rooms availability drops below 10% (Only 2 left).',
      bookingId: '',
      guestName: '',
      branch: 'Elegant Enclave Chennai',
      date: 'Yesterday',
      time: '10:00 AM',
      priority: 'medium',
      status: 'unread'
    },
    {
      id: 'NT-113',
      type: 'Report Generated',
      category: 'reports',
      description: 'Monthly Revenue Report for June 2026 compiled and ready for download.',
      bookingId: '',
      guestName: '',
      branch: 'Elegant Enclave Chennai',
      date: 'Last 7 Days',
      time: '30 June 05:00 PM',
      priority: 'low',
      status: 'read'
    },
    {
      id: 'NT-114',
      type: 'System Alert',
      category: 'system',
      description: 'Nightly cloud backup completed successfully. Total data verified: 4.8 GB.',
      bookingId: '',
      guestName: '',
      branch: 'System Core',
      date: 'Last 7 Days',
      time: '30 June 03:00 AM',
      priority: 'low',
      status: 'read'
    },
    {
      id: 'NT-115',
      type: 'Security Alert',
      category: 'security',
      description: 'Multiple invalid login attempts detected from IP 192.168.1.104.',
      bookingId: '',
      guestName: '',
      branch: 'HQ Security',
      date: 'Last 7 Days',
      time: '29 June 10:15 PM',
      priority: 'high',
      status: 'unread'
    },
    {
      id: 'NT-116',
      type: 'Review Submitted',
      category: 'messages',
      description: 'A new 5-star review was submitted on TripAdvisor: "Magnificent stay!".',
      bookingId: '',
      guestName: 'Nisha Pillai',
      branch: 'Elegant Enclave Chennai',
      date: 'Last 7 Days',
      time: '28 June 04:30 PM',
      priority: 'low',
      status: 'read'
    },
    {
      id: 'NT-117',
      type: 'Housekeeping Completed',
      category: 'maintenance',
      description: 'Room 502 cleared by housekeeping. Status updated to Available.',
      bookingId: '',
      guestName: '',
      branch: 'Elegant Enclave Chennai',
      date: 'Last 7 Days',
      time: '28 June 11:00 AM',
      priority: 'low',
      status: 'read'
    },
    {
      id: 'NT-118',
      type: 'Room Out Of Service',
      category: 'maintenance',
      description: 'Room 102 set to OOO status due to scheduled bathroom renovation.',
      bookingId: '',
      guestName: '',
      branch: 'Elegant Enclave Chennai',
      date: 'Last 30 Days',
      time: '25 June 09:00 AM',
      priority: 'low',
      status: 'read'
    }
  ];

  // 2. Selectors and Navigation Setup
  const container = document.getElementById('notificationsContainer');
  const sizeSelector = document.getElementById('pageSizeSelector');
  const paginationList = document.getElementById('notificationPagination');
  const searchInput = document.getElementById('searchQuery');
  const prioritySelect = document.getElementById('filterPriority');
  const statusSelect = document.getElementById('filterStatus');
  const dateSelect = document.getElementById('filterDate');

  let activeCategory = 'all';
  let currentPage = 1;
  let pageSize = 25;

  // Initialize Bootstrap tooltips with exact custom constraints
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl, {
      delay: { show: 300, hide: 0 },
      customClass: 'elegant-tooltip'
    });
  });

  // Calculate and update summary KPI indicators
  function updateSummaryStats() {
    const unreadCount = notifications.filter(n => n.status === 'unread').length;
    const highCount = notifications.filter(n => n.priority === 'high' && n.status !== 'archived').length;
    const pendingCount = notifications.filter(n => ['cancellations', 'modifications', 'refunds', 'maintenance'].includes(n.category) && n.status === 'unread').length;
    
    // KPI UI Updates
    document.getElementById('summaryUnread').textContent = unreadCount;
    document.getElementById('summaryHigh').textContent = highCount;
    document.getElementById('summaryPending').textContent = pendingCount;
    
    // Header Bell Badge
    const bellBadge = document.getElementById('navBellBadge');
    if (unreadCount > 0) {
      bellBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      bellBadge.style.display = 'inline-block';
    } else {
      bellBadge.style.display = 'none';
    }

    // Category Badges Updates
    document.getElementById('badge-all').textContent = notifications.filter(n => n.status !== 'archived').length;
    const cats = ['bookings', 'modifications', 'cancellations', 'refunds', 'checkins', 'checkouts', 'maintenance', 'messages', 'payments', 'reports', 'system', 'security'];
    cats.forEach(cat => {
      const el = document.getElementById(`badge-${cat}`);
      if (el) {
        el.textContent = notifications.filter(n => n.category === cat && n.status !== 'archived').length;
      }
    });
  }

  // Map category code to human readable text/icon colors
  function getIconInfo(category) {
    switch (category) {
      case 'bookings': return { class: 'icon-booking', icon: 'bi-calendar-check' };
      case 'checkins': return { class: 'icon-checkin', icon: 'bi-door-open' };
      case 'checkouts': return { class: 'icon-checkout', icon: 'bi-door-closed' };
      case 'modifications':
      case 'cancellations':
      case 'refunds': return { class: 'icon-request', icon: 'bi-hourglass-split' };
      case 'maintenance': return { class: 'icon-maintenance', icon: 'bi-tools' };
      case 'payments': return { class: 'icon-payment', icon: 'bi-credit-card' };
      case 'reports': return { class: 'icon-system', icon: 'bi-file-earmark-bar-graph' };
      case 'security': return { class: 'icon-security', icon: 'bi-shield-lock' };
      default: return { class: 'icon-system', icon: 'bi-info-circle' };
    }
  }

  // Get action button html code block matching operational notification rules
  function getActionButtonMarkup(n) {
    let markup = '';
    
    // Primary Action Button mapping
    if (n.type === 'Booking Confirmed') {
      markup += `<a href="bookings.html" class="btn btn-purple btn-sm py-1 px-3 fs-7 me-2">View Booking</a>`;
    } else if (n.type === 'Guest Checked In') {
      markup += `<a href="bookings.html?action=checkin" class="btn btn-purple btn-sm py-1 px-3 fs-7 me-2">Check-in Details</a>`;
    } else if (n.type === 'Guest Checked Out') {
      markup += `<a href="bookings.html?action=checkout" class="btn btn-purple btn-sm py-1 px-3 fs-7 me-2">Check-out Details</a>`;
    } else if (n.type === 'Booking Modification Request') {
      markup += `<a href="bookings.html?filter=modifications" class="btn btn-purple btn-sm py-1 px-3 fs-7 me-2">Approve Request</a>`;
    } else if (n.type === 'Booking Cancellation Request') {
      markup += `<a href="bookings.html?filter=cancellations" class="btn btn-purple btn-sm py-1 px-3 fs-7 me-2">Approve Request</a>`;
    } else if (n.type === 'Refund Request') {
      markup += `<a href="bookings.html?filter=refunds" class="btn btn-purple btn-sm py-1 px-3 fs-7 me-2">Refund Details</a>`;
    } else if (n.type === 'Room Maintenance Request') {
      markup += `<a href="rooms.html?tab=maintenance" class="btn btn-purple btn-sm py-1 px-3 fs-7 me-2">Assign Room</a>`;
    } else if (n.type === 'Payment Successful' || n.type === 'Payment Failed') {
      markup += `<a href="bookings.html" class="btn btn-purple btn-sm py-1 px-3 fs-7 me-2">View Payment</a>`;
    } else if (n.type === 'VIP Guest Arrival' || n.type === 'Guest Complaint') {
      markup += `<a href="guests.html" class="btn btn-purple btn-sm py-1 px-3 fs-7 me-2">Open Customer</a>`;
    } else if (n.type === 'Report Generated') {
      markup += `<a href="reports_export.html" class="btn btn-purple btn-sm py-1 px-3 fs-7 me-2">Download Report</a>`;
    }

    // Default secondary actions
    if (n.status === 'unread') {
      markup += `<button class="btn btn-outline-purple btn-sm py-1 px-2 fs-7 me-1" onclick="markSingleRead('${n.id}')">Mark Read</button>`;
    }
    markup += `<button class="btn btn-outline-danger btn-sm py-1 px-2 fs-7" onclick="archiveSingle('${n.id}')"><i class="bi bi-archive-fill"></i></button>`;

    return markup;
  }

  // 3. Render Loop with Filters
  function renderNotifications() {
    container.innerHTML = '';

    // Filter Logic
    let filtered = notifications.filter(n => {
      // Category side list check
      if (activeCategory !== 'all') {
        if (activeCategory === 'checkins' && n.category !== 'checkins') return false;
        if (activeCategory === 'checkouts' && n.category !== 'checkouts') return false;
        if (activeCategory === 'bookings' && n.category !== 'bookings') return false;
        if (activeCategory === 'modifications' && n.category !== 'modifications') return false;
        if (activeCategory === 'cancellations' && n.category !== 'cancellations') return false;
        if (activeCategory === 'refunds' && n.category !== 'refunds') return false;
        if (activeCategory === 'maintenance' && n.category !== 'maintenance') return false;
        if (activeCategory === 'messages' && n.category !== 'messages') return false;
        if (activeCategory === 'payments' && n.category !== 'payments') return false;
        if (activeCategory === 'reports' && n.category !== 'reports') return false;
        if (activeCategory === 'system' && n.category !== 'system') return false;
        if (activeCategory === 'security' && n.category !== 'security') return false;
      }

      // Priority Selector
      const priVal = prioritySelect.value;
      if (priVal !== 'all' && n.priority !== priVal) return false;

      // Status Selector (Handle hidden archive states)
      const statVal = statusSelect.value;
      if (statVal === 'all') {
        if (n.status === 'archived') return false; // Default hidden state
      } else {
        if (n.status !== statVal) return false;
      }

      // Date Range selector filter
      const dateVal = dateSelect.value;
      if (dateVal !== 'all') {
        if (dateVal === 'today' && n.date !== 'Today') return false;
        if (dateVal === 'yesterday' && n.date !== 'Yesterday') return false;
        if (dateVal === '7days' && n.date === 'Last 30 Days') return false;
      }

      // Search Query
      const q = searchInput.value.toLowerCase().trim();
      if (q) {
        const matchQ = (n.bookingId && n.bookingId.toLowerCase().includes(q)) ||
                       (n.guestName && n.guestName.toLowerCase().includes(q)) ||
                       (n.type && n.type.toLowerCase().includes(q)) ||
                       (n.description && n.description.toLowerCase().includes(q));
        if (!matchQ) return false;
      }

      return true;
    });

    // Empty state logic
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="card p-5 text-center border-0 shadow-sm rounded-4" style="background-color: #FFFFFF;">
          <div class="mb-3 text-secondary" style="font-size: 3rem;">
            <i class="bi bi-bell-slash text-warning"></i>
          </div>
          <h5 class="font-serif fw-bold text-purple mb-2">You're all caught up!</h5>
          <p class="text-secondary small mb-0">No notifications match your current filter selections.</p>
        </div>
      `;
      paginationList.innerHTML = '';
      return;
    }

    // Pagination calculations
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    if (currentPage > totalPages) currentPage = totalPages || 1;

    const startIndex = (currentPage - 1) * pageSize;
    const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);

    // Populate Container Cards
    paginatedItems.forEach(n => {
      const isUnread = n.status === 'unread';
      const isHigh = n.priority === 'high';
      const priorityClass = `badge-${n.priority}`;
      const statusClass = n.status === 'unread' ? 'badge-unread' : (n.status === 'read' ? 'badge-read' : 'badge-archived');
      const iconObj = getIconInfo(n.category);

      const card = document.createElement('div');
      card.className = `notification-card d-flex gap-3 mb-3 ${isUnread ? 'unread' : ''} ${isHigh ? 'high-priority' : ''}`;
      card.innerHTML = `
        <div class="notification-icon-wrapper ${iconObj.class} ${isHigh ? 'pulse-high' : ''}">
          <i class="bi ${iconObj.icon}"></i>
        </div>
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between align-items-start flex-wrap gap-1 mb-1">
            <h6 class="text-purple fw-bold mb-0" style="font-size: 0.95rem;">${n.type}</h6>
            <div class="d-flex gap-1 align-items-center">
              <span class="badge ${priorityClass} text-uppercase small" style="font-size: 0.65rem;">${n.priority}</span>
              <span class="badge ${statusClass} small" style="font-size: 0.65rem;">${n.status}</span>
            </div>
          </div>
          <p class="text-dark small mb-2">${n.description}</p>
          
          <div class="d-flex flex-wrap gap-3 mb-3 small text-secondary" style="font-size: 0.75rem;">
            ${n.bookingId ? `<span><i class="bi bi-hash me-1 text-warning"></i>${n.bookingId}</span>` : ''}
            ${n.guestName ? `<span><i class="bi bi-person-fill me-1 text-warning"></i>${n.guestName}</span>` : ''}
            <span><i class="bi bi-building me-1 text-warning"></i>${n.branch}</span>
            <span><i class="bi bi-clock me-1 text-warning"></i>${n.date}, ${n.time}</span>
          </div>

          <div class="d-flex justify-content-start align-items-center mt-2 border-top pt-2">
            ${getActionButtonMarkup(n)}
          </div>
        </div>
        ${isUnread ? `<div class="unread-indicator-dot"></div>` : ''}
      `;
      container.appendChild(card);
    });

    renderPaginationControls(totalPages);
  }

  // Render Page Selection Footer Elements
  function renderPaginationControls(totalPages) {
    paginationList.innerHTML = '';
    if (totalPages <= 1) return;

    // Previous Button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#">Previous</a>`;
    prevLi.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentPage > 1) {
        currentPage--;
        renderNotifications();
      }
    });
    paginationList.appendChild(prevLi);

    // Pages Numbers
    for (let i = 1; i <= totalPages; i++) {
      const pageLi = document.createElement('li');
      pageLi.className = `page-item ${currentPage === i ? 'active' : ''}`;
      pageLi.innerHTML = `<a class="page-link" href="#">${i}</a>`;
      pageLi.addEventListener('click', (e) => {
        e.preventDefault();
        currentPage = i;
        renderNotifications();
      });
      paginationList.appendChild(pageLi);
    }

    // Next Button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#">Next</a>`;
    nextLi.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentPage < totalPages) {
        currentPage++;
        renderNotifications();
      }
    });
    paginationList.appendChild(nextLi);
  }

  // 4. Interaction Handlers Global Exposure
  window.markSingleRead = function (id) {
    const item = notifications.find(n => n.id === id);
    if (item) {
      item.status = 'read';
      updateSummaryStats();
      renderNotifications();
    }
  };

  window.archiveSingle = function (id) {
    const item = notifications.find(n => n.id === id);
    if (item) {
      item.status = 'archived';
      updateSummaryStats();
      renderNotifications();
    }
  };

  window.triggerCategoryFilter = function (category) {
    activeCategory = category;
    
    // Highlight list
    document.querySelectorAll('#categoryFilterContainer .filter-list-item').forEach(el => {
      el.classList.remove('active');
      if (el.getAttribute('data-filter') === category) {
        el.classList.add('active');
      }
    });

    currentPage = 1;
    renderNotifications();
  };

  // Bind Left Category list filters
  document.querySelectorAll('#categoryFilterContainer .filter-list-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const filter = item.getAttribute('data-filter');
      triggerCategoryFilter(filter);
    });
  });

  // Bind Filters change events
  prioritySelect.addEventListener('change', () => { currentPage = 1; renderNotifications(); });
  statusSelect.addEventListener('change', () => { currentPage = 1; renderNotifications(); });
  dateSelect.addEventListener('change', () => { currentPage = 1; renderNotifications(); });
  sizeSelector.addEventListener('change', () => {
    pageSize = parseInt(sizeSelector.value);
    currentPage = 1;
    renderNotifications();
  });

  // Bind Search events
  searchInput.addEventListener('input', () => {
    currentPage = 1;
    renderNotifications();
  });
  document.getElementById('btnResetSearch').addEventListener('click', () => {
    searchInput.value = '';
    currentPage = 1;
    renderNotifications();
  });

  // Bulk actions - Mark all as read
  document.getElementById('btnMarkAllRead').addEventListener('click', () => {
    notifications.forEach(n => {
      if (n.status === 'unread') n.status = 'read';
    });
    updateSummaryStats();
    renderNotifications();
  });

  // Refresh
  document.getElementById('btnRefresh').addEventListener('click', () => {
    renderNotifications();
    updateSummaryStats();
  });

  // 5. Auto Refresh Simulator Loop (Every 60 seconds show new toast alerts)
  setInterval(() => {
    // Generate new mock notification representing operational updates
    const sampleGuests = ['Vijay Verma', 'Karan Johar', 'Samantha Ruth', 'Rahul Dravid'];
    const randomGuest = sampleGuests[Math.floor(Math.random() * sampleGuests.length)];
    const mockId = 'NT-' + Math.floor(100 + Math.random() * 900);
    
    const newAlert = {
      id: mockId,
      type: 'Booking Confirmed',
      category: 'bookings',
      description: `New room booking confirmed for ${randomGuest}. System validation checks completed.`,
      bookingId: 'EE-2026-' + Math.floor(1000 + Math.random() * 9000),
      guestName: randomGuest,
      branch: 'Elegant Enclave Chennai',
      date: 'Today',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      priority: 'low',
      status: 'unread'
    };

    notifications.unshift(newAlert);
    updateSummaryStats();
    renderNotifications();

    // Trigger Toast alert UI popup
    const toastEl = document.getElementById('liveToast');
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }, 60000);

  // Load saved notification configurations from localStorage (Default: all toggles enabled)
  function loadNotificationSettings() {
    const defaultSettings = {
      newBookings: true,
      requests: true,
      vipArrivals: true,
      maintenance: true,
      sound: false
    };
    
    const saved = localStorage.getItem('hbs_notification_settings');
    const settings = saved ? JSON.parse(saved) : defaultSettings;

    // Apply checkbox states
    document.getElementById('settingNewBookings').checked = settings.newBookings;
    document.getElementById('settingRequests').checked = settings.requests;
    document.getElementById('settingVipArrivals').checked = settings.vipArrivals;
    if (document.getElementById('settingMaintenance')) {
      document.getElementById('settingMaintenance').checked = settings.maintenance;
    }
    document.getElementById('settingSound').checked = settings.sound;
    
    return settings;
  }

  let isSavedFlag = false;

  // Save updated configurations back into localStorage
  function saveNotificationSettings() {
    const settings = {
      newBookings: document.getElementById('settingNewBookings').checked,
      requests: document.getElementById('settingRequests').checked,
      vipArrivals: document.getElementById('settingVipArrivals').checked,
      maintenance: document.getElementById('settingMaintenance') ? document.getElementById('settingMaintenance').checked : true,
      sound: document.getElementById('settingSound').checked
    };
    
    localStorage.setItem('hbs_notification_settings', JSON.stringify(settings));
    isSavedFlag = true;
    
    // Optional toast notification alert trigger feedback
    const toastEl = document.getElementById('liveToast');
    const toastSpan = toastEl.querySelector('.toast-body span');
    if (toastSpan) {
      toastSpan.textContent = 'Notification settings saved successfully.';
    }
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }

  // Bind Settings confirmation actions button
  const btnSaveSettings = document.querySelector('#settingsModal .btn-purple');
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener('click', saveNotificationSettings);
  }

  // Restore saved settings values if user closes the modal without saving changes
  const settingsModalEl = document.getElementById('settingsModal');
  if (settingsModalEl) {
    settingsModalEl.addEventListener('show.bs.modal', () => {
      isSavedFlag = false; // Reset flag when settings modal opens
    });
    settingsModalEl.addEventListener('hide.bs.modal', () => {
      if (!isSavedFlag) {
        loadNotificationSettings(); // Only revert if user didn't save changes
      }
    });
  }

  // Initial Settings configuration setup
  loadNotificationSettings();

  // Initial Boot Run
  updateSummaryStats();
  renderNotifications();
});
