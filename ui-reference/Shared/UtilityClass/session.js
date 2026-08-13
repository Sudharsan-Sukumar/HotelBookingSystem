if (typeof window.HotelState === 'undefined') {
class HotelState_Local {
  static get(key, defaultValue = null) {
    const val = localStorage.getItem('hbs_state_' + key);
    return val ? JSON.parse(val) : defaultValue;
  }
  static set(key, value) {
    localStorage.setItem('hbs_state_' + key, JSON.stringify(value));
  }

  static initDefaults() {
    if (!this.get('savedCards')) {
      this.set('savedCards', [
        { id: 'card_1', type: 'Visa', last4: '4242', exp: '12/28', name: 'Bennet Customer' },
        { id: 'card_2', type: 'Mastercard', last4: '5555', exp: '08/27', name: 'Bennet Customer' },
        { id: 'card_3', type: 'Amex', last4: '3782', exp: '10/26', name: 'Bennet Customer' }
      ]);
    }
    if (!this.get('currentUser')) {
      this.set('currentUser', {
        name: 'Bennet Customer',
        firstName: 'Bennet',
        lastName: 'Customer',
        email: 'bennet@hbs.local',
        phone: '+91 9876543210',
        role: 'Customer',
        loyaltyPoints: 1250,
        memberTier: 'Gold'
      });
    }
    let currentBookings = this.get('bookings');
    if (!currentBookings) {
      this.set('bookings', [
        {
          id: 'EE-COB-260625-7852',
          txnId: 'TXN7894561230',
          branch: 'Coimbatore',
          hotelName: 'The Elegant Suites Coimbatore',
          image: '../../../assets/images/hotel_cbe.png',
          checkIn: '20 Nov 2026',
          checkInDay: 'Friday',
          checkOut: '23 Nov 2026',
          checkOutDay: 'Monday',
          amount: '23,010.00',
          status: 'Upcoming',
          email: 'bennet@hbs.local'
        }
      ]);
    } else {
      let migrated = false;
      currentBookings.forEach(b => {
        if (b.checkIn === '25 Jun 2026' || b.checkIn === '25 jun 2026') {
          b.checkIn = '20 Nov 2026';
          b.checkInDay = 'Friday';
          b.checkOut = '23 Nov 2026';
          b.checkOutDay = 'Monday';
          migrated = true;
        }
      });
      if (migrated) {
        this.set('bookings', currentBookings);
      }
    }

    if (!this.get('users')) {
      this.set('users', []);
    }
    if (!this.get('hotels')) {
      this.set('hotels', []);
    }
    if (!this.get('roomTypes')) {
      this.set('roomTypes', []);
    }
    if (!this.get('housekeeping')) {
      this.set('housekeeping', []);
    }
    if (!this.get('guests')) {
      this.set('guests', []);
    }
  }

  static get currentUser() { return this.get('currentUser'); }
  static set currentUser(val) { this.set('currentUser', val); }

  static get savedCards() { return this.get('savedCards', []); }
  static set savedCards(val) { this.set('savedCards', val); }

  static addSavedCard(card) {
    const cards = this.savedCards;
    cards.push(card);
    this.savedCards = cards;
  }
  
  static get bookings() { return this.get('bookings', []); }
  static set bookings(val) { this.set('bookings', val); }
  
  static updateBookingStatus(id, newStatus) {
    const b = this.bookings;
    const index = b.findIndex(x => x.id === id);
    if(index !== -1) {
      b[index].status = newStatus;
      this.bookings = b;
    }
  }

  static get notifications() { return this.get('notifications', []); }
  static set notifications(val) { this.set('notifications', val); }

  static get users() { return this.get('users', []); }
  static set users(val) { this.set('users', val); }

  static get hotels() { return this.get('hotels', []); }
  static set hotels(val) { this.set('hotels', val); }

  static get roomTypes() { return this.get('roomTypes', []); }
  static set roomTypes(val) { this.set('roomTypes', val); }

  static get housekeeping() { return this.get('housekeeping', []); }
  static set housekeeping(val) { this.set('housekeeping', val); }

  static get guests() { return this.get('guests', []); }
  static set guests(val) { this.set('guests', val); }

  static get rooms() { return this.get('rooms', []); }
  static set rooms(val) { this.set('rooms', val); }

  static get content() { return this.get('content', {}); }
  static set content(val) { this.set('content', val); }

  // --- Utility query methods (mirrors state.js) ---
  static authenticate(email, password) {
    return this.users.find(u => u.email === email && u.password === password && u.status === 'Active') || null;
  }
  static getUserById(id) {
    return this.users.find(u => u.id === id) || null;
  }
  static getHotelById(id) {
    return this.hotels.find(h => h.id === id) || null;
  }
  static getRoomById(id) {
    return this.rooms.find(r => r.id === id) || null;
  }
  static getRoomsByHotel(hotelId) {
    return this.rooms.filter(r => r.hotelId === hotelId);
  }
  static getBookingsByCustomer(customerId) {
    const user = this.getUserById(customerId);
    return this.bookings.filter(b => b.customerId === customerId || (user && b.email === user.email));
  }
  static getBookingsByHotel(hotelId) {
    return this.bookings.filter(b => b.hotelId === hotelId);
  }
  static getNotificationsByUser(userId, role) {
    return this.notifications.filter(n => n.recipientId === userId || n.recipientRole === role);
  }
  static updateBooking(bookingId, updates) {
    const bookings = this.bookings;
    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx !== -1) {
      bookings[idx] = { ...bookings[idx], ...updates, updatedAt: new Date().toISOString() };
      this.bookings = bookings;
      return bookings[idx];
    }
    return null;
  }
  static updateRoomStatus(roomId, status) {
    const rooms = this.rooms;
    const idx = rooms.findIndex(r => r.id === roomId);
    if (idx !== -1) {
      rooms[idx].status = status;
      this.rooms = rooms;
    }
  }

  // ── getBookingLifecycle ────────────────────────────────────────────────────
  // DO NOT REMOVE OR MODIFY — mirrored from state.js.
  // Computes the real-time lifecycle stage of a booking from local dates.
  // Used by modify_booking_step1.js guard and my_bookings.js action rendering.
  // ──────────────────────────────────────────────────────────────────────────
  static getBookingLifecycle(booking) {
    if (booking.status === 'Cancelled' || booking.bookingStatus === 'Cancelled') {
      return { stage: 'cancelled', displayStatus: 'Cancelled',
               badgeClass: 'bg-danger text-white py-1 px-3 rounded-pill',
               canModify: false, canCancel: false, isRefundable: false };
    }
    const parseLocalMidnight = (str) => {
      if (!str) return null;
      const d = new Date(str);
      if (isNaN(d.getTime())) return null;
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };
    const checkInDay  = parseLocalMidnight(booking.checkIn);
    const checkOutDay = parseLocalMidnight(booking.checkOut);
    if (!checkInDay || !checkOutDay) {
      return { stage: 'upcoming', displayStatus: 'Upcoming',
               badgeClass: 'bg-primary text-white py-1 px-3 rounded-pill',
               canModify: false, canCancel: false, isRefundable: false };
    }
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const modificationDeadlineMs = checkInDay.getTime() - (24 * 60 * 60 * 1000);
    if (today >= checkOutDay) {
      return { stage: 'completed', displayStatus: 'Completed',
               badgeClass: 'bg-secondary text-white py-1 px-3 rounded-pill',
               canModify: false, canCancel: false, isRefundable: false };
    }
    if (today >= checkInDay && today < checkOutDay) {
      return { stage: 'active', displayStatus: 'Stay in Hotel',
               badgeClass: 'bg-success text-white py-1 px-3 rounded-pill',
               canModify: false, canCancel: false, isRefundable: false };
    }
    if (now.getTime() >= modificationDeadlineMs) {
      return { stage: 'upcoming-locked', displayStatus: 'Upcoming',
               badgeClass: 'bg-warning text-dark py-1 px-3 rounded-pill',
               canModify: false, canCancel: true, isRefundable: false };
    }
    return { stage: 'upcoming', displayStatus: 'Upcoming',
             badgeClass: 'bg-primary text-white py-1 px-3 rounded-pill',
             canModify: true, canCancel: true, isRefundable: true };
  }
  // ── End getBookingLifecycle ────────────────────────────────────────────────
}

window.HotelState = HotelState_Local;
}


if (typeof window.HBSValidation === 'undefined') {
  class HBSValidation_Session {
    static isNumeric(str) { return /^\d+$/.test(str); }
    static isValidPhone(phone) {
      const clean = phone.replace(/[\s\-\+]/g, '');
      return /^\d{10,15}$/.test(clean);
    }
    static isStrongPassword(pwd) {
      return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(pwd);
    }
    static isValidEmail(email) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    }
    static isValidLuhn(cardNumber) {
      const clean = cardNumber.replace(/\D/g, '');
      if (clean.length < 13 || clean.length > 19) return false;
      let sum = 0, shouldDouble = false;
      for (let i = clean.length - 1; i >= 0; i--) {
        let digit = parseInt(clean.charAt(i));
        if (shouldDouble) { if ((digit *= 2) > 9) digit -= 9; }
        sum += digit;
        shouldDouble = !shouldDouble;
      }
      return (sum % 10) == 0;
    }
    static isValidExpiry(expStr) {
      if (!/^\d{2}\/\d{2}$/.test(expStr)) return false;
      const parts = expStr.split('/');
      const month = parseInt(parts[0], 10);
      const year = parseInt('20' + parts[1], 10);
      if (month < 1 || month > 12) return false;
      const now = new Date();
      if (year < now.getFullYear()) return false;
      if (year === now.getFullYear() && month < (now.getMonth() + 1)) return false;
      return true;
    }
    static isValidCVV(cvv) { return /^\d{3,4}$/.test(cvv); }
  }
  window.HBSValidation = HBSValidation_Session;
}

if (window.HotelState && window.HotelState.initDefaults) {
  window.HotelState.initDefaults();
}

document.addEventListener('DOMContentLoaded', () => {
  // Sync the navigation header profile card display with sessionStorage data
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const userName = localStorage.getItem('userName');
  const userRole = localStorage.getItem('userRole');
  const userEmail = localStorage.getItem('userEmail');

  const loggedOutElements = document.querySelector('.auth-logged-out');
  const loggedInElements = document.querySelector('.auth-logged-in');

  // Dynamically resolve parent path depths to locate index.html and routes
  const path = window.location.pathname;
  const isNested = path.includes('Features/') || path.includes('features/');
  const isCandidateRole = path.includes('/Candidate/');
  const isManagerRole = path.includes('/Manager/');
  const isAdminRole = path.includes('/Admin/');
  
  // Calculate relative basePath depth offset
  let basePath = '';
  if (isNested) {
    if (isCandidateRole || isManagerRole || isAdminRole) {
      basePath = '../../../';
    } else {
      basePath = '../../';
    }
  }

  const candidatePath = isNested ? (isCandidateRole ? '' : `${basePath}features/User/Candidate/`) : 'features/User/Candidate/';
  const bookingsPath = isNested ? (path.includes('/bookings/') ? '' : `${basePath}features/bookings/`) : 'features/bookings/';
  const hotelsPath = isNested ? (path.includes('/hotels/') ? '' : `${basePath}features/hotels/`) : 'features/hotels/';

  // Rebuild the navbar anchors to work globally from any page location
  const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
  // Check if we are inside the admin module directory to avoid overriding admin specific routing links
  const isAdminModule = path.includes('/Admin/') || path.includes('/admin/');
  navLinks.forEach(link => {
    if (isAdminModule) return;
    const text = link.textContent.trim().toLowerCase();
    
    // Remove existing active states
    link.classList.remove('active');
    link.removeAttribute('aria-current');

    if (text === 'home') {
      link.href = basePath ? `${basePath}index.html` : '#';
      if (!isNested || path.endsWith('index.html')) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    } else if (text === 'hotels') {
      link.href = `${hotelsPath}search_results.html`;
      if (path.includes('/hotels/')) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    } else if (text === 'my bookings') {
      link.href = `${candidatePath}my_bookings.html`;
      if (path.includes('my_bookings.html')) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    } else if (text === 'notifications') {
      link.href = `${bookingsPath}notifications.html`;
      if (path.includes('/bookings/notifications.html') || path.endsWith('/notifications.html')) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    } else if (text === 'profile') {
      link.href = `${candidatePath}profile.html`;
      if (path.includes('/Candidate/profile.html') || path.endsWith('/profile.html')) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    }
  });

  // Align right side brand-logo brand link context
  const navBrand = document.querySelector('.navbar-brand');
  if (navBrand) {
    navBrand.href = basePath ? `${basePath}index.html` : '#';
  }

  if (loggedInElements) {
    if (isLoggedIn) {
      if (loggedOutElements) {
        loggedOutElements.classList.remove('d-flex');
        loggedOutElements.classList.add('d-none');
      }
      
      loggedInElements.classList.remove('d-none');
      loggedInElements.classList.add('d-flex');

      // Populate user info card
      const userNameEl = loggedInElements.querySelector('.user-name');
      const userRoleEl = loggedInElements.querySelector('.user-role');
      const userEmailEl = loggedInElements.querySelector('.user-email');

      if (userNameEl) userNameEl.textContent = userName;
      if (userRoleEl) userRoleEl.textContent = userRole;
      if (userEmailEl) userEmailEl.textContent = userEmail;

      // Remove legacy inline direct logout click behavior
      loggedInElements.removeAttribute('title');
      
      // Add a dropdown chevron symbol next to the profile avatar if not already present
      if (!loggedInElements.querySelector('.bi-chevron-down')) {
        const arrow = document.createElement('i');
        arrow.className = 'bi bi-chevron-down text-white-50';
        arrow.style.fontSize = '0.7rem';
        arrow.style.marginLeft = '4px';
        loggedInElements.appendChild(arrow);
      }
      
      // Inject dropdown menu markup into the DOM relative to the badge trigger
      const menuId = 'customerProfileDropdownMenu';
      if (!document.getElementById(menuId)) {
        const menuHTML = `
          <ul id="${menuId}" class="dropdown-menu dropdown-menu-end shadow border border-warning" style="background-color: #1A0A2E; display: none; position: absolute; right: 0; z-index: 1000; min-width: 160px; list-style: none; padding: 8px 0; margin-top: 8px; border-radius: 8px;">
            <li><a class="dropdown-item py-2 px-3 text-white small d-block text-decoration-none dropdown-custom-item" href="#" id="dropLinkProfile" style="font-size: 0.8rem; transition: all 0.2s;">View Profile</a></li>
            <li><hr class="dropdown-divider bg-secondary opacity-25 my-1"></li>
            <li><a class="dropdown-item py-2 px-3 text-danger small d-block text-decoration-none dropdown-custom-item" href="#" id="dropLinkLogout" style="font-size: 0.8rem; transition: all 0.2s;">Logout</a></li>
          </ul>
        `;
        // Wrap loggedInElements parent to position dropdown properly
        loggedInElements.style.position = 'relative';
        loggedInElements.insertAdjacentHTML('beforeend', menuHTML);

        // Inject dynamic hover styles for gold hover matching the UI
        if (!document.getElementById('dropdownHoverStyle')) {
          const style = document.createElement('style');
          style.id = 'dropdownHoverStyle';
          style.innerHTML = `
            .dropdown-custom-item:hover {
              background-color: rgba(212, 175, 55, 0.15) !important;
              color: #D4AF37 !important;
            }
          `;
          document.head.appendChild(style);
        }

        const dropMenu = document.getElementById(menuId);
        
        // Toggle dropdown on avatar container click
        loggedInElements.addEventListener('click', (e) => {
          e.stopPropagation();
          const isVisible = dropMenu.style.display === 'block';
          dropMenu.style.display = isVisible ? 'none' : 'block';
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
          dropMenu.style.display = 'none';
        });

        // Redirect handlers
        document.getElementById('dropLinkProfile').addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          let profileUrl = `${candidatePath}profile.html`;
          if (userRole === 'Admin') {
            profileUrl = isNested ? (isAdminRole ? 'profile.html' : `${basePath}features/User/Admin/profile.html`) : 'features/User/Admin/profile.html';
          } else if (userRole === 'Manager') {
            profileUrl = isNested ? (isManagerRole ? 'reports_profile.html' : `${basePath}features/User/Manager/reports_profile.html`) : 'features/User/Manager/reports_profile.html';
          }
          window.location.href = profileUrl;
        });

        document.getElementById('dropLinkLogout').addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          window.triggerConfirmLogout(e);
        });
      }
    } else {
      loggedInElements.classList.remove('d-flex');
      loggedInElements.classList.add('d-none');

      if (loggedOutElements) {
        loggedOutElements.classList.remove('d-none');
        loggedOutElements.classList.add('d-flex');
      }
    }
  }

  // Global window triggerRoomBook interceptor function
  window.triggerRoomBook = function(roomId) {
    if (!isLoggedIn) {
      if (window.showApkToast) {
        window.showApkToast('Please login to continue.', () => {
          window.location.href = `${basePath}features/Auth/login.html`;
        });
      } else {
        alert('Please login to continue.');
        window.location.href = `${basePath}features/Auth/login.html`;
      }
      return;
    }
    // Proceed to search results or booking creation
    window.location.href = `${hotelsPath}search_results.html`;
  };

  // Intercept navigation links requiring login sessions
  navLinks.forEach(link => {
    if (isAdminModule) return;
    const text = link.textContent.trim().toLowerCase();
    
    link.addEventListener('click', (e) => {
      if (text === 'hotels' || text === 'my bookings' || text === 'notifications' || text === 'profile') {
        if (!isLoggedIn) {
          e.preventDefault();
          if (window.showApkToast) {
            window.showApkToast('Please login to continue.', () => {
              window.location.href = `${basePath}features/Auth/login.html`;
            });
          } else {
            alert('Please login to continue.');
            window.location.href = `${basePath}features/Auth/login.html`;
          }
        }
      }
    });
  });

  // Intercept "View all rooms" promo and other direct search result layouts
  document.querySelectorAll('a[href*="search_results.html"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      if (!isLoggedIn) {
        e.preventDefault();
        if (window.showApkToast) {
          window.showApkToast('Please login to continue.', () => {
            window.location.href = `${basePath}features/Auth/login.html`;
          });
        } else {
          alert('Please login to continue.');
          window.location.href = `${basePath}features/Auth/login.html`;
        }
      }
    });
  });

  // Global window triggerConfirmLogout function to be consumed by both customer and manager headers
  window.triggerConfirmLogout = function (e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const logoutModal = document.getElementById('logoutConfirmModal');
    if (logoutModal) {
      logoutModal.classList.add('show');
    }
  };

  // -------------------------------------------------------------
  // Premium Social Redirect Modal Logic Implementation
  // -------------------------------------------------------------
  
  // Inject premium custom logout confirmation modal HTML dynamically if not present
  if (!document.getElementById('logoutConfirmModal')) {
    const logoutModalHTML = `
      <div id="logoutConfirmModal" class="social-modal" aria-hidden="true" role="dialog" aria-labelledby="logoutModalTitle" aria-describedby="logoutModalDesc">
        <div class="social-modal-backdrop" id="logoutModalBackdrop"></div>
        <div class="social-modal-content">
          <div class="social-modal-header text-center mb-3">
            <span class="modal-gold-icon" style="background-color: rgba(220, 53, 69, 0.1); color: #DC3545; width: 56px; height: 56px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 1.5rem; border: 1px solid rgba(220, 53, 69, 0.2);"><i class="bi bi-box-arrow-right"></i></span>
            <h2 id="logoutModalTitle" class="modal-title font-serif" style="color: #1A0A2E; font-size: 1.25rem; font-weight: bold; margin-top: 12px;">Confirm Logout</h2>
          </div>
          <div class="social-modal-body text-center mb-4">
            <p id="logoutModalDesc" class="modal-msg" style="color: #6C757D; font-size: 0.85rem;">Are you sure you want to end your session and logout from Elegant Enclave?</p>
          </div>
          <div class="social-modal-footer d-flex gap-3 justify-content-center">
            <button class="btn btn-modal-cancel" id="btnCancelLogout" style="border: 1px solid #1A0A2E; color: #1A0A2E; background: transparent; padding: 6px 20px; border-radius: 8px; font-weight: 500; font-size: 0.85rem;">Cancel</button>
            <button class="btn btn-modal-continue" id="btnConfirmLogout" style="background-color: #DC3545; color: white; border: none; padding: 6px 20px; border-radius: 8px; font-weight: 600; font-size: 0.85rem;">Logout</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', logoutModalHTML);

    // Bind logout modal buttons
    document.getElementById('btnCancelLogout').addEventListener('click', () => {
      document.getElementById('logoutConfirmModal').classList.remove('show');
    });
    document.getElementById('logoutModalBackdrop').addEventListener('click', () => {
      document.getElementById('logoutConfirmModal').classList.remove('show');
    });
    document.getElementById('btnConfirmLogout').addEventListener('click', () => {
      localStorage.clear();
      window.location.href = `${basePath}index.html`;
    });
  }

  // Inject social redirect modal HTML dynamically if not present
  if (!document.getElementById('socialRedirectModal')) {
    const modalHTML = `
      <div id="socialRedirectModal" class="social-modal" aria-hidden="true" role="dialog" aria-labelledby="redirectModalTitle" aria-describedby="redirectModalDesc">
        <div class="social-modal-backdrop" id="socialModalBackdrop"></div>
        <div class="social-modal-content">
          <div class="social-modal-header text-center mb-3">
            <span class="modal-gold-icon"><i class="bi bi-box-arrow-up-right"></i></span>
            <h2 id="redirectModalTitle" class="modal-title font-serif">Leaving Elegant Enclave</h2>
          </div>
          <div class="social-modal-body text-center mb-4">
            <p id="redirectModalDesc" class="modal-msg">You are about to leave the Elegant Enclave website and will be redirected to the official login page of <strong id="modalPlatformName">LinkedIn</strong>. Would you like to continue?</p>
          </div>
          <div class="social-modal-footer d-flex gap-3 justify-content-center">
            <button class="btn btn-modal-cancel" id="btnCancelSocial">Cancel</button>
            <button class="btn btn-modal-continue" id="btnContinueSocial">Continue</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }

  const modal = document.getElementById('socialRedirectModal');
  const backdrop = document.getElementById('socialModalBackdrop');
  const btnCancel = document.getElementById('btnCancelSocial');
  const btnContinue = document.getElementById('btnContinueSocial');
  const platformName = document.getElementById('modalPlatformName');

  let activeSocialIcon = null;
  let targetRedirectUrl = '';

  const socialMapping = {
    'bi-linkedin': { name: 'LinkedIn', url: 'https://www.linkedin.com/login' },
    'bi-instagram': { name: 'Instagram', url: 'https://www.instagram.com/accounts/login/' },
    'bi-facebook': { name: 'Facebook', url: 'https://www.facebook.com/login/' },
    'bi-twitter-x': { name: 'X', url: 'https://x.com/i/flow/login' }
  };

  // Find all social icon anchors
  document.querySelectorAll('.social-links a').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const icon = anchor.querySelector('i');
      if (!icon) return;

      // Detect class match mapping
      let match = null;
      icon.classList.forEach(cls => {
        if (socialMapping[cls]) {
          match = socialMapping[cls];
        }
      });

      if (match) {
        activeSocialIcon = anchor;
        targetRedirectUrl = match.url;
        platformName.textContent = match.name;
        
        // Show Modal
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        btnCancel.focus(); // Set initial focus on cancel
      }
    });
  });

  // Modal Closer function
  function closeModal() {
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    if (activeSocialIcon) {
      activeSocialIcon.focus(); // Return focus to the clicked icon
    }
  }

  // Keyboard accessibility focus trapping logic
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      return;
    }

    if (e.key === 'Tab') {
      const focusable = [btnCancel, btnContinue];
      const index = focusable.indexOf(document.activeElement);
      if (e.shiftKey) {
        if (index <= 0) {
          focusable[focusable.length - 1].focus();
          e.preventDefault();
        }
      } else {
        if (index === -1 || index >= focusable.length - 1) {
          focusable[0].focus();
          e.preventDefault();
        }
      }
    }
  });

  // Click listeners to close or proceed
  btnCancel.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);

  btnContinue.addEventListener('click', () => {
    window.open(targetRedirectUrl, '_blank', 'noopener,noreferrer');
    closeModal();
  });
});

// =============================================================
// REUSABLE FLOATING BACK-TO-TOP COMPONENT IMPLEMENTATION
// =============================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inject Floating Button Styles
  if (!document.getElementById('backToTopStyles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'backToTopStyles';
    styleEl.innerHTML = `
      .floating-back-to-top {
        position: fixed !important;
        bottom: 24px !important;
        right: 24px !important;
        width: 48px !important;
        height: 48px !important;
        background-color: #D4AF37 !important;
        border-radius: 50% !important;
        display: block !important;
        text-align: center !important;
        line-height: 48px !important;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3) !important;
        z-index: 99999 !important;
        opacity: 0 !important;
        visibility: hidden !important;
        transform: scale(0.9) !important;
        transition: opacity 0.3s ease, visibility 0.3s ease, transform 0.3s ease, background-color 0.2s ease, box-shadow 0.2s ease !important;
        cursor: pointer !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .floating-back-to-top.show {
        opacity: 1 !important;
        visibility: visible !important;
        transform: scale(1) !important;
      }
      .floating-back-to-top:hover {
        background-color: #EFD98C !important;
        box-shadow: 0 6px 20px rgba(212,175,55,0.4) !important;
        transform: translateY(-3px) scale(1.05) !important;
      }
      .floating-back-to-top:active {
        transform: translateY(-1px) scale(0.98) !important;
      }
      .floating-back-to-top i {
        font-size: 1.4rem;
        color: #1A0A2E !important;
        display: inline-block;
        vertical-align: middle;
        position: relative;
        top: -1px;
      }
    `;
    document.head.appendChild(styleEl);
  }

  // 2. Inject HTML Component Markup
  if (!document.getElementById('btnFloatingBackToTop')) {
    console.log("[BACK-TO-TOP DIAGNOSIS] Injecting HTML Button markup...");
    const btnHTML = `
      <button id="btnFloatingBackToTop" class="floating-back-to-top" aria-label="Back to Top" title="Back to Top">
        <i class="bi bi-arrow-up"></i>
      </button>
    `;
    document.body.insertAdjacentHTML('beforeend', btnHTML);
  }

  // 3. Configure Visibility & Smooth Scroll Bindings
  const backToTopBtn = document.getElementById('btnFloatingBackToTop');
  let isScrolling = false;

  if (backToTopBtn) {
    console.log("[BACK-TO-TOP DIAGNOSIS] Button found in DOM. Attaching scroll listeners...");

    const handleScroll = () => {
      // Check multiple scroll targets (window page offset, document container height offsets, body offsets)
      const winScroll = window.pageYOffset || window.scrollY || 0;
      const docScroll = document.documentElement.scrollTop || 0;
      const bodyScroll = document.body.scrollTop || 0;
      
      // Select the active scroll coordinate
      const scrollPosition = Math.max(winScroll, docScroll, bodyScroll);
      
      console.log(`[BACK-TO-TOP DIAGNOSIS] Scroll Event Fired - Position: ${scrollPosition}px (window: ${winScroll}px, docElement: ${docScroll}px, body: ${bodyScroll}px)`);
      
      if (scrollPosition > 200) {
        backToTopBtn.classList.add('show');
      } else {
        backToTopBtn.classList.remove('show');
      }
    };

    // Attach to window, document element, and document.body to ensure capture inside nested scrolling views
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    if (document.body) {
      document.body.addEventListener('scroll', handleScroll, { passive: true });
    }

    // Smooth Scroll Action on Click
    backToTopBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log("[BACK-TO-TOP DIAGNOSIS] Button clicked!");
      if (isScrolling) return; // Prevent multiple overlapping clicks
      isScrolling = true;
      
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      document.documentElement.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      document.body.scrollTo({
        top: 0,
        behavior: 'smooth'
      });

      // Reset scrolling blocker when viewport reaches top
      const checkTop = setInterval(() => {
        const currentPos = Math.max(
          window.pageYOffset || window.scrollY || 0,
          document.documentElement.scrollTop || 0,
          document.body.scrollTop || 0
        );
        if (currentPos === 0) {
          isScrolling = false;
          clearInterval(checkTop);
          console.log("[BACK-TO-TOP DIAGNOSIS] Scroll animation finished, reached the top.");
        }
      }, 50);
    });
  } else {
    console.error("[BACK-TO-TOP DIAGNOSIS] Button element was NOT successfully created or found!");
  }
});
