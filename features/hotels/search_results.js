document.addEventListener('DOMContentLoaded', () => {

  // --- SAFETY NET: Ensure data is always seeded before this page renders ---
  // This covers cases where the IIFE in login.js didn't run (direct navigation to this page)
  if (window.HotelState && typeof HotelState.initDefaults === 'function') {
    HotelState.initDefaults();
  }

  const filterForm = document.getElementById('filterForm');
  const locationSelect = document.getElementById('filterLocation');
  const checkinInput = document.getElementById('filterCheckIn');
  const checkoutInput = document.getElementById('filterCheckOut');
  const maxPriceInput = document.getElementById('filterMaxPrice');
  const hotelListings = document.getElementById('hotelListingsContainer');
  const noResultsState = document.getElementById('noResultsState');
  const btnReset = document.getElementById('btnResetFilters');
  const btnResetEmpty = document.getElementById('btnResetFiltersEmpty');

  if (!hotelListings) {
    console.error('[HBS] #hotelListingsContainer not found in DOM');
    return;
  }

  // Inject Sort dropdown into header select container
  const sortSelectContainer = document.getElementById('sortSelectContainer');
  if (sortSelectContainer) {
    sortSelectContainer.innerHTML = `
      <select id="sortHotels" class="form-select w-auto">
        <option value="none">Sort By...</option>
        <option value="price_low">Price: Low to High</option>
        <option value="price_high">Price: High to Low</option>
        <option value="rating_high">Rating: High to Low</option>
      </select>
    `;
  }
  const sortSelect = document.getElementById('sortHotels');

  // Load from URL params or sessionStorage
  const params = new URLSearchParams(window.location.search);
  let savedSearch = null;

  if (params.has('location') || params.has('checkin')) {
    savedSearch = {
      location: params.get('location') || 'All',
      checkIn: params.get('checkin') || '',
      checkOut: params.get('checkout') || '',
      adults: params.get('adults') || 1,
      children: params.get('children') || 0
    };
    sessionStorage.setItem('hbs_booking_search', JSON.stringify(savedSearch));
  } else {
    const raw = sessionStorage.getItem('hbs_booking_search');
    if (raw) try { savedSearch = JSON.parse(raw); } catch(e) {}
  }

  // Pre-fill filter inputs from saved search
  if (savedSearch) {
    if (locationSelect && savedSearch.location) locationSelect.value = savedSearch.location;
    if (checkinInput && savedSearch.checkIn) checkinInput.value = savedSearch.checkIn;
    if (checkoutInput && savedSearch.checkOut) checkoutInput.value = savedSearch.checkOut;
  }

  // Bind dynamic date min limits
  if (checkinInput && checkoutInput) {
    const today = new Date().toISOString().split('T')[0];
    checkinInput.min = today;

    checkinInput.addEventListener('change', () => {
      if (checkinInput.value) {
        const ci = new Date(checkinInput.value);
        ci.setDate(ci.getDate() + 1);
        checkoutInput.min = ci.toISOString().split('T')[0];
        if (checkoutInput.value && new Date(checkoutInput.value) <= new Date(checkinInput.value)) {
          checkoutInput.value = '';
        }
      } else {
        checkoutInput.removeAttribute('min');
      }
    });
  }

  // Fix hotel imageUrl path depth:
  // Seed stores '../../../assets/...' (for pages 3 levels deep)
  // search_results.html is only 2 levels deep → correct to '../../'
  function getHotelImage(hotel) {
    const raw = hotel.imageUrl || hotel.image || '';
    if (!raw) return '../../assets/images/hotel_cbe.png';
    // Replace leading '../../../' with '../../'
    return raw.replace(/^(\.\.\/)+assets\//, '../../assets/');
  }

  // Show the "no results" empty state
  function showNoResults() {
    hotelListings.innerHTML = '';
    hotelListings.classList.add('d-none');
    if (noResultsState) noResultsState.classList.remove('d-none');
  }

  // Show hotel cards
  function showHotels(finalHotels) {
    hotelListings.innerHTML = '';
    hotelListings.classList.remove('d-none');
    if (noResultsState) noResultsState.classList.add('d-none');

    finalHotels.forEach(item => {
      const h = item.hotel;
      const imgSrc = getHotelImage(h);
      const priceFormatted = '&#8377;' + Number(item.lowestPrice).toLocaleString('en-IN');
      const typesStr = [...new Set(item.rooms.map(r => r.type))].join(', ');
      const amenitiesHtml = (h.amenities || []).slice(0, 5)
        .map(am => `<span class="badge bg-light text-dark border">${am}</span>`).join('');

      const card = `
        <article class="hotel-card bg-white border rounded overflow-hidden" data-id="${h.id}">
          <div class="row g-0 h-100">
            <div class="col-md-5 h-100">
              <div class="hotel-img-wrapper" style="min-height:220px; overflow:hidden;">
                <img src="${imgSrc}" alt="${h.name}" style="width:100%;height:100%;min-height:220px;object-fit:cover;">
              </div>
            </div>
            <div class="col-md-7 d-flex flex-column justify-content-between p-4">
              <div>
                <div class="d-flex align-items-center gap-2 mb-2">
                  <span class="hotel-icon-badge text-warning fs-5"><i class="bi bi-building"></i></span>
                  <h3 class="hotel-title m-0">${h.name}</h3>
                </div>
                <div class="d-flex align-items-center gap-2 mb-2 small text-muted">
                  ${h.rating ? `<span class="text-warning"><i class="bi bi-star-fill"></i> ${h.rating}/5</span><span>|</span>` : ''}
                  <span>${item.availableRoomsCount} Room(s) Available</span>
                </div>
                <p class="hotel-rooms-sub text-muted small mb-3">Available Types: ${typesStr}</p>
                <div class="d-flex gap-2 flex-wrap mb-3">${amenitiesHtml}</div>
              </div>
              <div class="d-flex justify-content-between align-items-end mt-2">
                <div class="price-container">
                  <span class="price-label small text-muted d-block">Starts from:</span>
                  <p class="price-value m-0 fs-4 fw-bold text-dark">${priceFormatted}
                    <span class="fs-6 text-muted fw-normal">/night</span>
                  </p>
                </div>
                <button class="btn btn-view-details px-4 py-2" type="button"
                  data-hotel-id="${h.id}"
                  style="background-color:#1A0A2E;color:#D4AF37;border:none;border-radius:6px;font-weight:600;">
                  View Details <i class="bi bi-arrow-right ms-1"></i>
                </button>
              </div>
            </div>
          </div>
        </article>`;
      hotelListings.insertAdjacentHTML('beforeend', card);
    });

    // Attach click listeners to View Details buttons
    hotelListings.querySelectorAll('.btn-view-details').forEach(btn => {
      btn.addEventListener('click', e => {
        const hotelId = e.currentTarget.getAttribute('data-hotel-id');
        if (!hotelId) return;
        const state = {
          location: locationSelect ? locationSelect.value : 'All',
          checkIn:  checkinInput  ? checkinInput.value  : '',
          checkOut: checkoutInput ? checkoutInput.value : '',
          adults:   savedSearch ? savedSearch.adults   : 1,
          children: savedSearch ? savedSearch.children : 0,
          hotelId
        };
        sessionStorage.setItem('hbs_booking_search', JSON.stringify(state));
        window.location.href = `../hotels/hotel_details.html?hotelId=${hotelId}`;
      });
    });
  }

  // Core filter + render function
  function renderHotels() {
    try {
      // Ensure data exists — call initDefaults as safety net
      if (window.HotelState && typeof HotelState.initDefaults === 'function') {
        HotelState.initDefaults();
      }

      const selectedLocation = locationSelect ? locationSelect.value.trim() : 'All';
      const maxPriceRaw = maxPriceInput ? maxPriceInput.value.replace(/[^0-9.]/g, '') : '';
      const maxPrice = maxPriceRaw !== '' ? parseFloat(maxPriceRaw) : Infinity;

      const checkedTypes = Array.from(
        document.querySelectorAll('.filter-checkbox:checked')
      ).map(cb => cb.value);

      // Fetch hotels from state
      const allHotels = (window.HotelState && HotelState.hotels) ? HotelState.hotels : [];

      if (allHotels.length === 0) {
        console.warn('[HBS] No hotels found in HotelState. Data may not be seeded yet.');
        showNoResults();
        return;
      }

      let activeHotels = allHotels.filter(h => h.status === 'Active');

      // Location filter
      if (selectedLocation && selectedLocation !== 'All') {
        activeHotels = activeHotels.filter(h =>
          h.location && h.location.toLowerCase().includes(selectedLocation.toLowerCase())
        );
      }

      const finalHotels = [];

      activeHotels.forEach(hotel => {
        const allRooms = window.HotelState ? HotelState.getRoomsByHotel(hotel.id) : [];
        let rooms = allRooms.filter(r => r.status === 'Available');

        if (checkedTypes.length > 0) {
          rooms = rooms.filter(r => checkedTypes.includes(r.type));
        }

        if (rooms.length === 0) return;

        const lowestPrice = Math.min(...rooms.map(r => Number(r.pricePerNight) || 0));
        if (isFinite(maxPrice) && lowestPrice > maxPrice) return;

        finalHotels.push({ hotel, availableRoomsCount: rooms.length, lowestPrice, rooms });
      });

      // Sort
      const sortVal = sortSelect ? sortSelect.value : 'none';
      if (sortVal === 'price_low')   finalHotels.sort((a, b) => a.lowestPrice - b.lowestPrice);
      if (sortVal === 'price_high')  finalHotels.sort((a, b) => b.lowestPrice - a.lowestPrice);
      if (sortVal === 'rating_high') finalHotels.sort((a, b) => b.hotel.rating - a.hotel.rating);

      if (finalHotels.length === 0) {
        showNoResults();
      } else {
        showHotels(finalHotels);
      }

    } catch (err) {
      console.error('[HBS] renderHotels() error:', err);
      hotelListings.innerHTML = `
        <div class="alert alert-warning text-center py-4">
          <i class="bi bi-exclamation-triangle fs-3 d-block mb-2"></i>
          <strong>Could not load hotels.</strong><br>
          <small>Open browser console (F12) and share the error for support.</small>
        </div>`;
      hotelListings.classList.remove('d-none');
    }
  }

  // Apply Filters (form submit)
  if (filterForm) {
    filterForm.addEventListener('submit', e => {
      e.preventDefault();

      if (checkinInput && checkoutInput && checkinInput.value && checkoutInput.value) {
        const ci = new Date(checkinInput.value);
        const co = new Date(checkoutInput.value);
        ci.setHours(0,0,0,0); co.setHours(0,0,0,0);
        const today = new Date(); today.setHours(0,0,0,0);
        const errEl = document.getElementById('dateErrorMsg');

        if (ci < today) {
          if (errEl) { errEl.textContent = 'Check-in date cannot be in the past.'; errEl.classList.remove('d-none'); }
          return;
        }
        if (co <= ci) {
          if (errEl) { errEl.textContent = 'Check-out must be after check-in.'; errEl.classList.remove('d-none'); }
          return;
        }
        if (errEl) errEl.classList.add('d-none');
      }

      const btn = filterForm.querySelector('button[type="submit"]');
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Fetching...';
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = orig;
        renderHotels();
      }, 400);
    });
  }

  // Shared reset logic
  function resetAllFilters() {
    if (locationSelect) locationSelect.value = 'All';
    if (checkinInput)   checkinInput.value = '';
    if (checkoutInput)  checkoutInput.value = '';
    if (maxPriceInput)  maxPriceInput.value = '';
    document.querySelectorAll('.filter-checkbox').forEach(cb => cb.checked = false);
    const errEl = document.getElementById('dateErrorMsg');
    if (errEl) errEl.classList.add('d-none');
    if (sortSelect) sortSelect.value = 'none';
    renderHotels();
  }

  if (btnReset)      btnReset.addEventListener('click', resetAllFilters);
  if (btnResetEmpty) btnResetEmpty.addEventListener('click', resetAllFilters);
  if (sortSelect)    sortSelect.addEventListener('change', renderHotels);

  // Initial render — wait slightly for DOMContentLoaded + initDefaults to complete
  setTimeout(renderHotels, 200);
});
