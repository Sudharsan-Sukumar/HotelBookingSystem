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
        if (action === 'plus' && roomsCount < 5) {
          roomsCount++;
        } else if (action === 'minus' && roomsCount > 1) {
          roomsCount--;
        }
        document.getElementById('roomsValue').textContent = roomsCount;
        document.querySelector('[data-type="rooms"][data-action="minus"]').disabled = roomsCount <= 1;
        document.querySelector('[data-type="rooms"][data-action="plus"]').disabled = roomsCount >= 5;
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

  // Setup Check-in / Check-out dynamic min-date and date constraints
  const checkinInput = document.getElementById('checkin');
  const checkoutInput = document.getElementById('checkout');
  const todayStr = new Date().toISOString().split('T')[0];
  if (checkinInput) {
    checkinInput.setAttribute('min', todayStr);
  }

  if (checkinInput) {
    checkinInput.addEventListener('change', () => {
      if (checkoutInput && checkoutInput.value) {
        const checkinObj = new Date(checkinInput.value);
        const checkoutObj = new Date(checkoutInput.value);
        if (checkoutObj <= checkinObj) {
          checkoutInput.value = '';
        }
      }
      validateStayDates();
    });
  }
  if (checkoutInput) {
    checkoutInput.addEventListener('change', () => {
      validateStayDates();
    });
  }

  function validateStayDates() {
    if (!checkinInput || !checkoutInput) return false;
    
    const checkinValError = document.getElementById('checkinValidationError');
    const checkoutValError = document.getElementById('checkoutValidationError');
    
    if (checkinValError) {
      checkinValError.textContent = '';
      checkinValError.classList.add('d-none');
    }
    if (checkoutValError) {
      checkoutValError.textContent = '';
      checkoutValError.classList.add('d-none');
    }
    
    if (!checkinInput.value) {
      if (checkinValError) {
        checkinValError.textContent = 'Please select a check-in date.';
        checkinValError.classList.remove('d-none');
      }
      return false;
    }
    if (!checkoutInput.value) {
      if (checkoutValError) {
        checkoutValError.textContent = 'Please select a check-out date.';
        checkoutValError.classList.remove('d-none');
      }
      return false;
    }
    
    const checkinDate = new Date(checkinInput.value);
    const checkoutDate = new Date(checkoutInput.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkinTime = new Date(checkinDate.getFullYear(), checkinDate.getMonth(), checkinDate.getDate());
    const checkoutTime = new Date(checkoutDate.getFullYear(), checkoutDate.getMonth(), checkoutDate.getDate());
    const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (checkinTime < todayTime) {
      if (checkinValError) {
        checkinValError.textContent = 'Check-in must be today or a future date.';
        checkinValError.classList.remove('d-none');
      }
      return false;
    }

    if (checkoutTime <= checkinTime) {
      if (checkoutValError) {
        checkoutValError.textContent = 'Check-out must be after check-in date.';
        checkoutValError.classList.remove('d-none');
      }
      return false;
    }

    const msDiff = checkoutTime.getTime() - checkinTime.getTime();
    const nightCount = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
    if (nightCount > 30) {
      if (checkoutValError) {
        checkoutValError.textContent = 'Maximum stay is limited to 30 consecutive nights.';
        checkoutValError.classList.remove('d-none');
      }
      return false;
    }

    return true;
  }

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

      if (!validateStayDates()) {
        return;
      }

      const checkin = checkinInput.value;
      const checkout = checkoutInput.value;
      const checkinDate = new Date(checkin);
      const checkoutDate = new Date(checkout);
      const msDiff = checkoutDate.getTime() - checkinDate.getTime();
      const nightCount = Math.ceil(msDiff / (1000 * 60 * 60 * 24));

      const savedSearch = {
        location: 'All',
        checkIn: checkin,
        checkOut: checkout,
        adults: guestsCount,
        children: 0,
        rooms: roomsCount,
        nights: nightCount
      };

      // Save parameters in localStorage and sessionStorage for propagation
      localStorage.setItem('search_checkin', checkin);
      localStorage.setItem('search_checkout', checkout);
      localStorage.setItem('search_guests', guestsCount);
      localStorage.setItem('search_rooms', roomsCount);
      localStorage.setItem('search_nights', nightCount);
      localStorage.setItem('hbs_booking_search', JSON.stringify(savedSearch));
      sessionStorage.setItem('hbs_booking_search', JSON.stringify(savedSearch));
      sessionStorage.setItem('search_checkin', checkin);
      sessionStorage.setItem('search_checkout', checkout);
      sessionStorage.setItem('search_guests_rooms', guestsRoomsInput.value);

      // Redirect to branch search results page
      window.location.href = 'features/hotels/search_results.html';
    });
  }

  // 5. CMS Content Synchronization
  function syncCMSContent() {
    const content = typeof HotelState !== 'undefined' ? HotelState.content : {};
    
    const heroTitle = content.hero?.tagline || localStorage.getItem('cms_hero_title');
    const heroSub = content.hero?.subtitle || localStorage.getItem('cms_hero_subtitle');
    let heroImg = content.hero?.backgroundImage || localStorage.getItem('cms_hero_image');
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

    const aboutHeading = content.about?.heading || localStorage.getItem('cms_about_heading');
    const aboutSub = content.about?.body || localStorage.getItem('cms_about_sub');

    const footerPhone = content.contact?.phone || localStorage.getItem('cms_footer_phone');
    const footerEmail = content.contact?.email || localStorage.getItem('cms_footer_email');
    const footerBranches = content.contact?.address || localStorage.getItem('cms_footer_branches');

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

  // 6. Dynamic Active Hotels Cards Rendering
  function renderActiveHotels() {
    const container = document.getElementById('dynamicHotelsContainer');
    if (!container) return;

    const hotels = typeof HotelState !== 'undefined' ? HotelState.hotels.filter(h => h.status === 'Active') : [];
    
    // We only take up to 3 hotels to leave room for the "View all rooms" card, or we just render all and append the promo card
    const hotelsToRender = hotels.slice(0, 3);
    
    let html = '';
    hotelsToRender.forEach(h => {
      html += `
        <div class="col-md-6 col-lg-4">
          <article class="room-card">
            <div class="room-image-wrapper">
              <img src="${h.imageUrl}" alt="${h.name}">
              <span class="room-type-badge">${h.location.split(',')[0]}</span>
              <div class="room-rating">
                <i class="bi bi-star-fill"></i> ${h.rating}
              </div>
            </div>
            <div class="room-details">
              <h3 class="room-title">${h.name}</h3>
              <p class="room-desc text-truncate" style="max-height: 48px; white-space: normal;">${h.description}</p>
              
              <div class="room-specs mb-2">
                <span><i class="bi bi-door-open"></i> ${h.totalRooms} Rooms</span>
                <span><span class="text-muted">|</span> <i class="bi bi-clock"></i> Check-in ${h.checkInTime}</span>
              </div>

              <div class="room-footer mt-auto pt-3 border-top">
                <div class="room-price">
                  <span style="font-size: 0.8rem;">From</span> <span>₹${h.priceStartsFrom}</span>
                </div>
                <button class="btn btn-book" onclick="selectBranchRedirect('${h.location.split(',')[0]}')" type="button">Explore</button>
              </div>
            </div>
          </article>
        </div>
      `;
    });

    // Add the View All card
    html += `
      <div class="col-md-6 col-lg-4">
        <div class="view-all-rooms-card luxury-promo-card-wrapper position-relative overflow-hidden d-flex flex-column justify-content-between p-4 p-lg-5">
          <div class="luxury-icon-wrapper-gold d-flex align-items-center justify-content-center">
            <i class="bi bi-building"></i>
          </div>
          <div class="promo-body mt-4 text-start">
            <h3 class="promo-heading text-white m-0">View all hotels</h3>
            <div class="gold-divider-short my-3"></div>
            <p class="promo-desc text-white">Explore our complete collection of luxury destinations and find the perfect stay for you.</p>
          </div>
          <div class="d-flex justify-content-end align-items-center mt-3">
            <a href="features/hotels/search_results.html" class="brushed-gold-circle-btn d-flex align-items-center justify-content-center" aria-label="Explore all luxury hotels">
              <i class="bi bi-arrow-right"></i>
            </a>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  renderActiveHotels();

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
