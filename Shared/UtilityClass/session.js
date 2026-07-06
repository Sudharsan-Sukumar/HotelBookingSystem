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
      basePath = '../../../../';
    } else {
      basePath = '../../';
    }
  }

  const candidatePath = isNested ? (isCandidateRole ? '' : `${basePath}Features/User/Candidate/`) : 'Features/User/Candidate/';
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
          window.location.href = `${candidatePath}profile.html`;
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
      const path = window.location.pathname;
      if (path.includes('features/')) {
        window.location.href = '../../index.html';
      } else {
        window.location.href = 'index.html';
      }
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
