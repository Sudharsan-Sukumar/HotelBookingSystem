document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('section.col-lg-9');
  const btnMarkAllRead = document.getElementById('btnMarkAllRead');
  const countAll = document.getElementById('countAll');
  const sidebarLinks = document.querySelectorAll('.sidebar-link');
  const lblTitleGroup = document.getElementById('lblTitleGroup');

  const countBookings = document.getElementById('countBookings');
  const countPayments = document.getElementById('countPayments');

  // Verify auth session credentials. Hide data if unauthenticated.
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) {
    if (container) {
      container.innerHTML = `
        <div class="profile-card bg-white p-5 rounded border text-center shadow-sm my-4">
          <div class="mb-4 text-warning" style="font-size: 3rem;"><i class="bi bi-shield-lock"></i></div>
          <h3 class="font-serif text-dark mb-3">Login to View Notifications</h3>
          <p class="text-muted mb-4 small">You must be logged in to view your system alert notifications and messages.</p>
          <a href="../authentication/login.html" class="btn btn-confirm-pay px-4 py-2" style="background-color: #1A0A2E; color: white; border-radius: 8px;">Login to Continue</a>
        </div>
      `;
    }
    if (btnMarkAllRead) btnMarkAllRead.style.display = 'none';
    if (countAll) countAll.textContent = '0';
    if (lblTitleGroup) lblTitleGroup.textContent = 'Notifications (0)';
    return;
  }

  // Load custom mock notifications from Global State
  let mockNotifs = typeof HotelState !== 'undefined' ? HotelState.notifications : [];

  // If there are custom notifications, inject them before the static ones
  if (mockNotifs.length > 0 && container) {
    mockNotifs.forEach(notif => {
      const card = document.createElement('article');
      card.className = 'notification-card bg-white p-4 rounded border mb-3';
      card.setAttribute('data-id', notif.id);
      card.setAttribute('data-cat', notif.cat);
      card.setAttribute('data-unread', notif.unread ? 'true' : 'false');
      
      const badgeClass = notif.cat === 'booking' ? 'bg-green-light text-success' : 'bg-blue-light text-primary';
      const iconClass = notif.cat === 'booking' ? 'bi bi-check-circle' : 'bi bi-credit-card';
      const iconColor = notif.cat === 'booking' ? 'green' : 'blue';
      const buttonText = notif.cat === 'booking' ? 'View Refund Details' : 'View Payment';
      const dotColor = notif.cat === 'booking' ? 'green' : 'blue';

      card.innerHTML = `
        <div class="row g-3 align-items-center">
          <div class="col-auto">
            <span class="icon-avatar-badge ${iconColor}"><i class="${iconClass}"></i></span>
          </div>
          <div class="col col-md-7 ps-md-3">
            <h4 class="notif-title m-0 text-dark font-serif">${notif.title}</h4>
            <p class="small text-muted mt-1 mb-3">${notif.desc}</p>
            <a href="../../features/User/Candidate/my_bookings.html" class="btn btn-action-notif py-2 px-4 btn-${iconColor}">${buttonText}</a>
          </div>
          <div class="col-12 col-md-3 text-md-end d-flex flex-row flex-md-column justify-content-between align-items-center align-items-md-end gap-3 mt-3 mt-md-0">
            <div class="notif-meta">
              <span class="badge ${badgeClass} fw-bold px-3 py-1 rounded-pill d-inline-block mb-2">${notif.cat.toUpperCase()}</span>
              <span class="small text-muted d-block">${notif.time}</span>
              <span class="small text-muted d-block">Today</span>
            </div>
            ${notif.unread ? `<span class="unread-dot ${dotColor}"></span>` : ''}
          </div>
        </div>
      `;

      // Insert immediately before the static notifications
      const refNode = document.querySelector('.notification-card');
      if (refNode) {
        container.insertBefore(card, refNode);
      } else {
        container.appendChild(card);
      }

      // Update badge counts accordingly
      if (notif.unread) {
        let allVal = parseInt(countAll.textContent) || 0;
        countAll.textContent = allVal + 1;
        
        if (notif.cat === 'booking' && countBookings) {
          let bVal = parseInt(countBookings.textContent) || 0;
          countBookings.textContent = bVal + 1;
        } else if (notif.cat === 'payment' && countPayments) {
          let pVal = parseInt(countPayments.textContent) || 0;
          countPayments.textContent = pVal + 1;
        }
      }
    });
  }

  // Recalculate title banner text dynamically based on actual rendered items
  const initialCards = document.querySelectorAll('.notification-card');
  const countAllVal = initialCards.length;
  if (countAll) countAll.textContent = countAllVal;
  if (lblTitleGroup) {
    lblTitleGroup.textContent = `All Notifications (${countAllVal})`;
  }

  const notificationCards = document.querySelectorAll('.notification-card');
  const unreadDots = document.querySelectorAll('.unread-dot');

  // 1. Mark All as Read click behavior
  if (btnMarkAllRead) {
    btnMarkAllRead.addEventListener('click', () => {
      unreadDots.forEach(dot => {
        dot.style.display = 'none';
      });

      // Clear HotelState flags
      mockNotifs.forEach(n => n.unread = false);
      if (typeof HotelState !== 'undefined') {
        HotelState.notifications = mockNotifs;
      }

      if (countAll) countAll.textContent = '0';
      if (countBookings) countBookings.textContent = '0';
      if (countPayments) countPayments.textContent = '0';
      if (lblTitleGroup) lblTitleGroup.textContent = 'All Notifications (0)';
    });
  }

  // 2. Individual click unread dot remover logic
  notificationCards.forEach(card => {
    const btnAction = card.querySelector('.btn-action-notif');
    if (btnAction) {
      btnAction.addEventListener('click', () => {
        const dot = card.querySelector('.unread-dot');
        const notifId = card.getAttribute('data-id');

        if (dot && dot.style.display !== 'none') {
          dot.style.display = 'none';
          
          // Clear HotelState flag for this specific notification
          const item = mockNotifs.find(n => n.id === notifId);
          if (item) {
            item.unread = false;
            if (typeof HotelState !== 'undefined') {
              HotelState.notifications = mockNotifs;
            }
          }

          // Decrement counters
          let currentAll = parseInt(countAll.textContent) || 0;
          if (currentAll > 0) {
            currentAll--;
            countAll.textContent = currentAll;
            lblTitleGroup.textContent = `All Notifications (${currentAll})`;
          }

          const cat = card.getAttribute('data-cat');
          if (cat === 'booking' && countBookings) {
            let val = parseInt(countBookings.textContent) || 0;
            if (val > 0) countBookings.textContent = val - 1;
          } else if (cat === 'payment' && countPayments) {
            let val = parseInt(countPayments.textContent) || 0;
            if (val > 0) countPayments.textContent = val - 1;
          }
        }
      });
    }
  });

  // 3. Tab Filter categorization click logic
  let activeCategory = 'all';

  sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
      sidebarLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      activeCategory = link.getAttribute('data-category');
      applyFilters();
    });
  });

  const dateFilterSelect = document.getElementById('dateFilter');
  const sortFilterSelect = document.getElementById('sortFilter');
  const btnApplyFilters = document.getElementById('btnApplyFilters');
  const btnResetFilters = document.getElementById('btnResetFilters');

  function applyFilters() {
    const selectedDateRange = dateFilterSelect ? dateFilterSelect.value : 'all';
    const sortOrder = sortFilterSelect ? sortFilterSelect.value : 'newest';

    const cards = Array.from(document.querySelectorAll('.notification-card'));
    let visibleCount = 0;

    // Filter notifications
    cards.forEach(card => {
      const cardCat = card.getAttribute('data-cat');
      const cardDateAttr = card.getAttribute('data-date') || 'older';

      const matchesCat = (activeCategory === 'all' || cardCat === activeCategory);
      const matchesDate = (selectedDateRange === 'all' || (selectedDateRange === 'today' && cardDateAttr === 'today'));

      if (matchesCat && matchesDate) {
        card.style.display = 'block';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    // Sort notifications
    const sortedCards = cards.filter(c => c.style.display === 'block').sort((a, b) => {
      const tsA = parseInt(a.getAttribute('data-timestamp') || '0', 10);
      const tsB = parseInt(b.getAttribute('data-timestamp') || '0', 10);
      
      if (sortOrder === 'newest') {
        return tsB - tsA;
      } else {
        return tsA - tsB;
      }
    });

    // Re-append sorted visible cards to container
    sortedCards.forEach(card => {
      container.appendChild(card);
    });

    // Re-append bottom support card to be at the very bottom
    const supportCard = document.querySelector('.bottom-support-card');
    if (supportCard) {
      container.appendChild(supportCard);
    }

    // Update heading label count
    let titlePrefix = "All Notifications";
    const activeLink = document.querySelector('.sidebar-link.active');
    if (activeLink) {
      titlePrefix = activeLink.querySelector('span').textContent.trim();
    }
    if (lblTitleGroup) {
      lblTitleGroup.textContent = `${titlePrefix} (${visibleCount})`;
    }
  }

  // Bind Apply Button click
  if (btnApplyFilters) {
    btnApplyFilters.addEventListener('click', () => {
      applyFilters();
    });
  }

  // Bind Reset Button click
  if (btnResetFilters) {
    btnResetFilters.addEventListener('click', () => {
      // Reset sidebar active class to All
      sidebarLinks.forEach(l => l.classList.remove('active'));
      const defaultAllLink = document.querySelector('.sidebar-link[data-category="all"]');
      if (defaultAllLink) defaultAllLink.classList.add('active');
      activeCategory = 'all';

      // Reset selects
      if (dateFilterSelect) dateFilterSelect.value = 'all';
      if (sortFilterSelect) sortFilterSelect.value = 'newest';

      applyFilters();
    });
  }
});
