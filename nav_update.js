const fs = require('fs');

const files = [
    "features/User/Manager/dashboard.html",
    "features/User/Manager/check_in.html",
    "features/User/Manager/check_out.html",
    "features/User/Manager/room_availability.html",
    "features/User/Manager/housekeeping.html",
    "features/User/Manager/notifications.html"
];

const navTemplate = `<nav class="navbar navbar-expand-md manager-top-nav py-2 sticky-top" style="background-color: #1A0A2E !important;">
  <div class="container-fluid px-4 d-flex align-items-center flex-nowrap">
    
    <!-- Brand Logo -->
    <a class="navbar-brand d-flex align-items-center gap-2 me-3" href="dashboard.html" style="flex-shrink: 0;">
      <img src="../../../assets/images/logo.png" alt="Elegant Enclave" style="height: 42px; width: auto; object-fit: contain; border-radius: 50%; border: 1.5px solid #D4AF37; margin-right: 12px;" onerror="this.outerHTML='<span style=\\'color: #D4AF37; font-size: 1.5rem; margin-right: 12px;\\'><i class=\\'bi bi-award-fill\\'></i></span>'">
      <span class="brand-text text-white fw-bold fs-4">Elegant<span style="color: #D4AF37;">Enclave</span></span>
    </a>
    <!-- Navigation Menu -->
    <div class="d-flex align-items-center justify-content-between flex-grow-1 gap-2">
      <ul class="navbar-nav ms-xl-4 gap-1 flex-row flex-nowrap">
        
        <!-- Dashboard -->
        <li class="nav-item">
          <a class="nav-link {dashboard_active}" href="dashboard.html"><i class="bi bi-grid-fill me-1"></i> Dashboard</a>
        </li>
        
        <!-- Operations Dropdown -->
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle {operations_active}" href="#" id="navOperations" role="button" data-bs-toggle="dropdown">
            <i class="bi bi-calendar-check-fill me-1"></i> Operations
          </a>
          <ul class="dropdown-menu shadow border" style="background-color: #1A0A2E;">
            <li><a class="dropdown-item text-white small py-2 {checkin_active}" href="check_in.html">Check-In</a></li>
            <li><a class="dropdown-item text-white small py-2 {checkout_active}" href="check_out.html">Check-Out</a></li>
          </ul>
        </li>
        
        <!-- Rooms Dropdown -->
        <li class="nav-item dropdown">
          <a class="nav-link dropdown-toggle {rooms_active}" href="#" id="navRooms" role="button" data-bs-toggle="dropdown">
            <i class="bi bi-building-fill me-1"></i> Rooms
          </a>
          <ul class="dropdown-menu shadow border" style="background-color: #1A0A2E;">
            <li><a class="dropdown-item text-white small py-2 {roomavail_active}" href="room_availability.html">Room Availability</a></li>
            <li><a class="dropdown-item text-white small py-2 {housekeeping_active}" href="housekeeping.html">Housekeeping</a></li>
          </ul>
        </li>
      </ul>
      <!-- Right: Notification Bell + Profile -->
      <div class="d-flex align-items-center gap-2">
        <a href="notifications.html" class="btn notification-bell-btn position-relative text-white p-2">
          <i class="bi bi-bell-fill text-warning"></i>
          <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" id="navNotifCount" style="font-size: 0.6rem; display: none;">0</span>
        </a>
        <div class="dropdown border-start border-secondary border-opacity-50 ps-2">
          <button class="btn dropdown-toggle d-flex align-items-center gap-2 p-0 text-white border-0" type="button" id="profileDropdown" data-bs-toggle="dropdown" style="background: transparent !important;">
            <div class="profile-avatar-circle" id="navAvatarInitials">MG</div>
            <div class="lh-sm text-start text-white d-none d-lg-block">
              <strong class="d-block small" id="navManagerName" style="font-size: 0.75rem;">Manager</strong>
            </div>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow border border-warning" style="background-color: #1A0A2E; border-radius: 12px; margin-top: 10px;">
            <li><a class="dropdown-item py-2 px-3 text-white d-flex align-items-center gap-2" href="#" id="navViewProfile" style="font-size: 0.85rem;"><i class="bi bi-person-fill text-warning"></i> View Profile</a></li>
            <li><hr class="dropdown-divider bg-secondary opacity-25"></li>
            <li><a class="dropdown-item py-2 px-3 text-danger d-flex align-items-center gap-2" href="#" onclick="triggerConfirmLogout(event)" style="font-size: 0.85rem;"><i class="bi bi-box-arrow-right"></i> Logout</a></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</nav>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    const userName = localStorage.getItem('userName') || 'Manager';
    const userId = localStorage.getItem('userId');
    const nameEl = document.getElementById('navManagerName');
    const initialsEl = document.getElementById('navAvatarInitials');
    if (nameEl) nameEl.textContent = userName.split(' ')[0];
    if (initialsEl) {
      const parts = userName.split(' ');
      initialsEl.textContent = (parts[0]?.[0] || 'M') + (parts[1]?.[0] || '');
    }
    // Load unread notification count
    if (window.HotelState) {
      const notifs = HotelState.getNotificationsByUser(userId, 'Manager').filter(n => !n.isRead);
      const badge = document.getElementById('navNotifCount');
      if (badge && notifs.length > 0) {
        badge.textContent = notifs.length;
        badge.style.display = 'block';
      }
    }
  });
</script>`;

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf-8');
    const startIdx = content.indexOf('<nav class="navbar');
    const endIdx = content.indexOf('</nav>', startIdx) + 6;
    
    if (startIdx !== -1 && endIdx !== -1) {
        let replacement = navTemplate;
        
        replacement = replacement.replace('{dashboard_active}', f.includes('dashboard') ? 'active' : '');
        replacement = replacement.replace('{operations_active}', (f.includes('check_in') || f.includes('check_out')) ? 'active' : '');
        replacement = replacement.replace('{checkin_active}', f.includes('check_in') ? 'active' : '');
        replacement = replacement.replace('{checkout_active}', f.includes('check_out') ? 'active' : '');
        replacement = replacement.replace('{rooms_active}', (f.includes('room_availability') || f.includes('housekeeping')) ? 'active' : '');
        replacement = replacement.replace('{roomavail_active}', f.includes('room_availability') ? 'active' : '');
        replacement = replacement.replace('{housekeeping_active}', f.includes('housekeeping') ? 'active' : '');

        const newContent = content.substring(0, startIdx) + replacement + content.substring(endIdx);
        fs.writeFileSync(f, newContent, 'utf-8');
    }
});

console.log('Done!');
