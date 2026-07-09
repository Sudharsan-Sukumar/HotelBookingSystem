import os

files = [
    "features/User/Manager/dashboard.html",
    "features/User/Manager/check_in.html",
    "features/User/Manager/check_out.html",
    "features/User/Manager/room_availability.html",
    "features/User/Manager/housekeeping.html",
    "features/User/Manager/notifications.html"
]

nav_template = """<nav class="navbar navbar-expand-md manager-top-nav py-2 sticky-top" style="background-color: #1A0A2E !important;">
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
</script>"""

for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    start_idx = content.find('<nav class="navbar')
    end_idx = content.find('</nav>', start_idx) + 6
    
    if start_idx != -1 and end_idx != -1:
        kwargs = {
            "dashboard_active": "",
            "operations_active": "",
            "checkin_active": "",
            "checkout_active": "",
            "rooms_active": "",
            "roomavail_active": "",
            "housekeeping_active": "",
            "notif_active": ""
        }
        
        if "dashboard" in f:
            kwargs["dashboard_active"] = "active"
        elif "check_in" in f:
            kwargs["operations_active"] = "active"
            kwargs["checkin_active"] = "active"
        elif "check_out" in f:
            kwargs["operations_active"] = "active"
            kwargs["checkout_active"] = "active"
        elif "room_availability" in f:
            kwargs["rooms_active"] = "active"
            kwargs["roomavail_active"] = "active"
        elif "housekeeping" in f:
            kwargs["rooms_active"] = "active"
            kwargs["housekeeping_active"] = "active"

        replacement = nav_template.format(**kwargs)
        new_content = content[:start_idx] + replacement + content[end_idx:]
        
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
            
print("Done!")
