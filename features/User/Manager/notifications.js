const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');
const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

if (!isLoggedIn || userRole !== 'Manager') {
  window.location.href = '../../../features/Auth/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  let allNotifications = [];
  let currentFilter = 'All';

  function loadNotifications() {
    let notifs = HotelState.getNotificationsByUser(userId, 'Manager') || [];
    
    if (notifs.length === 0) {
      notifs = [
        { id: 'n1', type: 'booking', title: 'New Booking: Deluxe Suite', message: 'John Doe booked Deluxe Suite for 3 nights.', createdAt: new Date().toISOString(), isRead: false },
        { id: 'n2', type: 'checkin', title: 'VIP Check-in Pending', message: 'Jane Smith (Gold Member) is scheduled to arrive at 2 PM.', createdAt: new Date(Date.now() - 3600000).toISOString(), isRead: false },
        { id: 'n3', type: 'maintenance', title: 'Maintenance Request', message: 'Room 204 reported AC issues.', createdAt: new Date(Date.now() - 7200000).toISOString(), isRead: true },
        { id: 'n4', type: 'checkout', title: 'Late Check-out Requested', message: 'Room 305 requested check-out at 1 PM.', createdAt: new Date(Date.now() - 86400000).toISOString(), isRead: true }
      ];
      HotelState.set('notifications', notifs);
    }
    
    allNotifications = notifs;
    // Sort descending
    allNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    renderNotifications();
  }

  function getIconForType(type) {
    switch (type) {
      case 'booking': return '<i class="bi bi-calendar-check fs-4 text-primary"></i>';
      case 'checkin': return '<i class="bi bi-box-arrow-in-right fs-4 text-success"></i>';
      case 'checkout': return '<i class="bi bi-box-arrow-right fs-4 text-secondary"></i>';
      case 'maintenance': return '<i class="bi bi-tools fs-4 text-warning"></i>';
      case 'system': return '<i class="bi bi-info-circle fs-4 text-info"></i>';
      case 'alert': return '<i class="bi bi-exclamation-triangle fs-4 text-danger"></i>';
      default: return '<i class="bi bi-bell fs-4 text-purple"></i>';
    }
  }

  function timeAgo(dateString) {
    const past = new Date(dateString);
    const now = new Date();
    const diffMs = now - past;
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    return `${diffDays} days ago`;
  }

  function renderNotifications() {
    const listContainer = document.getElementById('notificationsContainer');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    let filtered = allNotifications;
    if (currentFilter === 'Unread') {
      filtered = filtered.filter(n => !n.isRead);
    } else if (currentFilter === 'System') {
      filtered = filtered.filter(n => n.type === 'system');
    } else if (currentFilter === 'Alerts') {
      filtered = filtered.filter(n => n.type === 'alert' || n.type === 'maintenance');
    }

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center text-muted py-5">
          <i class="bi bi-bell-slash fs-1 mb-3 d-block text-secondary opacity-50"></i>
          <h5>No Notifications</h5>
          <p class="small">You're all caught up!</p>
        </div>
      `;
      return;
    }

    filtered.forEach(n => {
      const isUnreadClass = n.isRead ? '' : 'bg-light border-start border-4 border-primary';
      const readBadge = n.isRead ? '' : '<span class="badge bg-primary rounded-pill mb-2">New</span>';
      
      const notifHtml = `
        <div class="list-group-item list-group-item-action p-4 mb-2 rounded shadow-sm border ${isUnreadClass}">
          <div class="d-flex w-100 justify-content-between align-items-start gap-3">
            <div class="notif-icon-circle bg-white rounded-circle shadow-sm d-flex align-items-center justify-content-center flex-shrink-0" style="width: 50px; height: 50px;">
              ${getIconForType(n.type)}
            </div>
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <h6 class="mb-0 fw-bold text-dark">${n.title} ${readBadge}</h6>
                <small class="text-muted fw-medium">${timeAgo(n.createdAt)}</small>
              </div>
              <p class="mb-2 text-secondary small">${n.message}</p>
              <div class="d-flex gap-3 align-items-center mt-2">
                ${!n.isRead ? `<button class="btn btn-sm btn-link text-decoration-none p-0 fw-semibold text-primary btn-mark-read" data-id="${n.id}"><i class="bi bi-check2"></i> Mark as read</button>` : ''}
                <button class="btn btn-sm btn-link text-decoration-none p-0 fw-semibold text-danger btn-delete-notif" data-id="${n.id}"><i class="bi bi-trash3"></i> Delete</button>
              </div>
            </div>
          </div>
        </div>
      `;
      listContainer.insertAdjacentHTML('beforeend', notifHtml);
    });

    document.querySelectorAll('.btn-mark-read').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        HotelState.markNotificationAsRead(id);
        loadNotifications();
      });
    });

    document.querySelectorAll('.btn-delete-notif').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const notifs = HotelState.notifications.filter(x => x.id !== id);
        HotelState.set('notifications', notifs);
        loadNotifications();
      });
    });
  }

  const btnMarkAll = document.getElementById('btnMarkAllRead');
  if (btnMarkAll) {
    btnMarkAll.addEventListener('click', () => {
      let notifs = HotelState.notifications;
      notifs = notifs.map(n => {
        if (n.userId === userId && n.role === 'Manager') {
          return { ...n, isRead: true };
        }
        return n;
      });
      HotelState.set('notifications', notifs);
      loadNotifications();
    });
  }

  const filterTabs = document.querySelectorAll('.filter-list-item');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      filterTabs.forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      currentFilter = e.currentTarget.textContent.trim();
      renderNotifications();
    });
  });

  loadNotifications();
});
