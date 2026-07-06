document.addEventListener('DOMContentLoaded', () => {
  // 1. Guests & Rooms Dropdown Controls
  const dropdownTrigger = document.getElementById('guestsRoomsDropdown');
  const guestsRoomsInput = document.getElementById('guestsRoomsInput');
  
  let guestsCount = 2;
  let roomsCount = 1;

  function updateGuestsInput() {
    guestsRoomsInput.value = `${guestsCount} Guest${guestsCount > 1 ? 's' : ''}, ${roomsCount} Room${roomsCount > 1 ? 's' : ''}`;
  }

  // Setup click listeners inside counter rows
  document.querySelectorAll('.btn-counter').forEach(button => {
    button.addEventListener('click', (e) => {
      e.stopPropagation(); // Avoid closing dropdown
      const type = button.dataset.type; // 'guests' or 'rooms'
      const action = button.dataset.action; // 'plus' or 'minus'
      
      if (type === 'guests') {
        if (action === 'plus' && guestsCount < 4) {
          guestsCount++;
        } else if (action === 'minus' && guestsCount > 1) {
          guestsCount--;
        }
        document.getElementById('guestsValue').textContent = guestsCount;
        document.querySelector('[data-type="guests"][data-action="minus"]').disabled = guestsCount <= 1;
        document.querySelector('[data-type="guests"][data-action="plus"]').disabled = guestsCount >= 4;
      } else if (type === 'rooms') {
        if (action === 'plus' && roomsCount < 2) {
          roomsCount++;
        } else if (action === 'minus' && roomsCount > 1) {
          roomsCount--;
        }
        document.getElementById('roomsValue').textContent = roomsCount;
        document.querySelector('[data-type="rooms"][data-action="minus"]').disabled = roomsCount <= 1;
        document.querySelector('[data-type="rooms"][data-action="plus"]').disabled = roomsCount >= 2;
      }
      
      updateGuestsInput();
    });
  });

  // Prevent dropdown from closing when clicking inside it
  const dropdownMenu = document.querySelector('.guests-dropdown-menu');
  if (dropdownMenu) {
    dropdownMenu.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }



  // 3. Simple Toast Alert on Booking click (Removed default alerts, handled via HTML inline functions instead)

  const searchBtn = document.querySelector('.btn-search');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      if (!isLoggedIn) {
        if (window.showApkToast) {
          window.showApkToast('Please login to continue.', () => {
            window.location.href = 'features/Auth/login.html';
          });
        } else {
          alert('Please login to continue.');
          window.location.href = 'features/Auth/login.html';
        }
        return;
      }

      const checkin = document.getElementById('checkin').value;
      const checkout = document.getElementById('checkout').value;

      const checkinValError = document.getElementById('checkinValidationError');
      const checkoutValError = document.getElementById('checkoutValidationError');

      // Clear previous validation states
      if (checkinValError) {
        checkinValError.textContent = '';
        checkinValError.classList.add('d-none');
      }
      if (checkoutValError) {
        checkoutValError.textContent = '';
        checkoutValError.classList.add('d-none');
      }
      
      // Business Logic verification
      if (!checkin) {
        if (checkinValError) {
          checkinValError.textContent = 'Please select a check-in date.';
          checkinValError.classList.remove('d-none');
        }
        return;
      }
      if (!checkout) {
        if (checkoutValError) {
          checkoutValError.textContent = 'Please select a check-out date.';
          checkoutValError.classList.remove('d-none');
        }
        return;
      }
      
      const checkinDate = new Date(checkin);
      const checkoutDate = new Date(checkout);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check-in must be today or in the future
      if (checkinDate < today) {
        if (checkinValError) {
          checkinValError.textContent = 'Check-in must be today or a future date.';
          checkinValError.classList.remove('d-none');
        }
        return;
      }

      // Check-out must be at least 1 day after check-in
      const msDiff = checkoutDate.getTime() - checkinDate.getTime();
      const nightCount = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
      if (nightCount < 1) {
        if (checkoutValError) {
          checkoutValError.textContent = 'Check-out must be at least 1 night after check-in.';
          checkoutValError.classList.remove('d-none');
        }
        return;
      }

      // Max stay limit (30 consecutive nights)
      if (nightCount > 30) {
        if (checkoutValError) {
          checkoutValError.textContent = 'Maximum stay is limited to 30 consecutive nights.';
          checkoutValError.classList.remove('d-none');
        }
        return;
      }

      // Reservations can be made up to 365 days in advance
      const oneYearFromToday = new Date(today);
      oneYearFromToday.setDate(oneYearFromToday.getDate() + 365);
      if (checkinDate > oneYearFromToday) {
        if (checkinValError) {
          checkinValError.textContent = 'Reservations can only be made up to 365 days in advance.';
          checkinValError.classList.remove('d-none');
        }
        return;
      }

      // Save parameters in sessionStorage for propagation
      sessionStorage.setItem('search_checkin', checkin);
      sessionStorage.setItem('search_checkout', checkout);
      sessionStorage.setItem('search_guests_rooms', guestsRoomsInput.value);

      // Redirect to branch search results page
      window.location.href = 'features/hotels/search_results.html';
    });
  }

  // 5. CMS Content Synchronization
  function syncCMSContent() {
    const heroTitle = localStorage.getItem('cms_hero_title');
    const heroSub = localStorage.getItem('cms_hero_subtitle');
    let heroImg = localStorage.getItem('cms_hero_image');
    if (heroImg) {
      // Strip any wrapping quotes from file selection paths
      heroImg = heroImg.replace(/^["']|["']$/g, '');
      // Format absolute Windows paths correctly for CSS file:/// URLs
      if (heroImg.includes('\\') || /^[A-Za-z]:/.test(heroImg)) {
        let cleanPath = heroImg.replace(/\\/g, '/');
        if (!cleanPath.startsWith('file:///')) {
          // Prepend scheme with drive letter format
          heroImg = 'file:///' + cleanPath;
        } else {
          heroImg = cleanPath;
        }
      }
    }

    const aboutHeading = localStorage.getItem('cms_about_heading');
    const aboutSub = localStorage.getItem('cms_about_sub');

    const footerPhone = localStorage.getItem('cms_footer_phone');
    const footerEmail = localStorage.getItem('cms_footer_email');
    const footerBranches = localStorage.getItem('cms_footer_branches');

    if (heroTitle && document.getElementById('customerHeroTitle')) {
      document.getElementById('customerHeroTitle').textContent = heroTitle;
    }
    if (heroSub && document.getElementById('customerHeroSubtitle')) {
      document.getElementById('customerHeroSubtitle').textContent = heroSub;
    }
    if (heroImg && document.getElementById('customerHeroSection')) {
      document.getElementById('customerHeroSection').style.backgroundImage = `url('${heroImg}')`;
    }

    if (aboutHeading && document.getElementById('customerAboutTitle')) {
      document.getElementById('customerAboutTitle').textContent = aboutHeading;
    }
    if (aboutSub && document.getElementById('customerAboutSubtitle')) {
      document.getElementById('customerAboutSubtitle').textContent = aboutSub;
    }

    if (footerPhone && document.getElementById('customerFooterPhone')) {
      document.getElementById('customerFooterPhone').innerHTML = `<i class="bi bi-telephone"></i> ${footerPhone}`;
    }
    if (footerEmail && document.getElementById('customerFooterEmail')) {
      document.getElementById('customerFooterEmail').innerHTML = `<i class="bi bi-envelope"></i> ${footerEmail}`;
    }
    if (footerBranches && document.getElementById('customerFooterBranches')) {
      document.getElementById('customerFooterBranches').innerHTML = `<i class="bi bi-geo-alt"></i> ${footerBranches}`;
    }
  }

  window.addEventListener('storage', (e) => {
    if (e.key.startsWith('cms_')) {
      syncCMSContent();
    }
  });

  syncCMSContent();

  // =============================================================
  // LANDING PAGE FLOATING BACK-TO-TOP IMPLEMENTATION
  // =============================================================
  
  // 1. Inject Styles
  if (!document.getElementById('landingBackToTopStyles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'landingBackToTopStyles';
    styleEl.innerHTML = `
      .landing-back-to-top {
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
      .landing-back-to-top.show {
        opacity: 1 !important;
        visibility: visible !important;
        transform: scale(1) !important;
      }
      .landing-back-to-top:hover {
        background-color: #EFD98C !important;
        box-shadow: 0 6px 20px rgba(212,175,55,0.4) !important;
        transform: translateY(-3px) scale(1.05) !important;
      }
      .landing-back-to-top:active {
        transform: translateY(-1px) scale(0.98) !important;
      }
      .landing-back-to-top i {
        font-size: 1.4rem !important;
        color: #1A0A2E !important;
        display: inline-block !important;
        vertical-align: middle !important;
        position: relative !important;
        top: -1px !important;
      }
    `;
    document.head.appendChild(styleEl);
  }

  // 2. Inject HTML
  if (!document.getElementById('backToTopBtn')) {
    const btnHTML = `
      <button id="backToTopBtn" class="landing-back-to-top" aria-label="Back to Top" title="Back to Top">
        <i class="bi bi-arrow-up"></i>
      </button>
    `;
    document.body.insertAdjacentHTML('beforeend', btnHTML);
  }

  // 3. Setup Scroll Visibility & Trigger Actions
  const landingBtn = document.getElementById('backToTopBtn');
  let isLandingScrolling = false;

  if (landingBtn) {
    const handleLandingScroll = () => {
      const winScroll = window.pageYOffset || window.scrollY || 0;
      const docScroll = document.documentElement.scrollTop || 0;
      const bodyScroll = document.body.scrollTop || 0;
      
      const scrollPosition = Math.max(winScroll, docScroll, bodyScroll);
      
      if (scrollPosition > 200) {
        landingBtn.classList.add('show');
      } else {
        landingBtn.classList.remove('show');
      }
    };

    // Attach listener hooks to window and body to capture any scrolling targets
    window.addEventListener('scroll', handleLandingScroll, { passive: true });
    document.addEventListener('scroll', handleLandingScroll, { passive: true });
    if (document.body) {
      document.body.addEventListener('scroll', handleLandingScroll, { passive: true });
    }

    landingBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (isLandingScrolling) return;
      isLandingScrolling = true;

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

      const checkLandingTop = setInterval(() => {
        const currentPos = Math.max(
          window.pageYOffset || window.scrollY || 0,
          document.documentElement.scrollTop || 0,
          document.body.scrollTop || 0
        );
        if (currentPos === 0) {
          isLandingScrolling = false;
          clearInterval(checkLandingTop);
        }
      }, 50);
    });
  }
});
