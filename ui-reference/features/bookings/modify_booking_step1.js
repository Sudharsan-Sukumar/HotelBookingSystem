document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('modifyStayForm');
  const btnReset = document.getElementById('btnReset');
  
  const checkinInput = document.getElementById('checkinDate');
  const checkoutInput = document.getElementById('checkoutDate');
  const selectGuests = document.getElementById('selectGuests');
  
  const checkinError = document.getElementById('checkinError');
  const checkoutError = document.getElementById('checkoutError');
  const btnCheckAvailability = document.getElementById('btnCheckAvailability');

  const generalFormError = document.getElementById('generalFormError');

  // Parse URL parameters to get bookingId or fallback to localStorage
  const params = new URLSearchParams(window.location.search);
  let bookingId = params.get('bookingId') || localStorage.getItem('selectedBookingId');
  if (bookingId) {
    localStorage.setItem('selectedBookingId', bookingId);
  } else {
    if (generalFormError) {
      generalFormError.textContent = 'Booking information could not be found. Please return to My Bookings and try again.';
      generalFormError.classList.remove('d-none');
    }
    return;
  }

  const currentUser = HotelState.currentUser || {};
  const userId = currentUser.id || 'USR001';

  // Fetch current booking record
  const bookings = HotelState.bookings;
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) {
    if (generalFormError) {
      generalFormError.textContent = 'Booking information could not be found. Please return to My Bookings and try again.';
      generalFormError.classList.remove('d-none');
    }
    return;
  }

  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  STABLE — DO NOT MODIFY THIS BLOCK                                       ║
  // ║  Booking Modification Lifecycle Guard                                    ║
  // ║  Enforces modification policy: active/completed/cancelled/24h-locked     ║
  // ║  bookings are shown as read-only with a clear error message.             ║
  // ║  Relies on HotelState.getBookingLifecycle() from state.js / session.js   ║
  // ╚══════════════════════════════════════════════════════════════════════════╝
  const lifecycle = HotelState.getBookingLifecycle(booking);
  if (!lifecycle.canModify) {
    let reason = 'This booking is not eligible for modification.';
    if (lifecycle.stage === 'active') {
      reason = 'Your stay has already begun. Modifications are not permitted once you have checked in.';
    } else if (lifecycle.stage === 'upcoming-locked') {
      reason = 'Modification is locked — check-in is less than 24 hours away. Please contact the hotel reception for assistance.';
    } else if (lifecycle.stage === 'completed') {
      reason = 'This booking has already been completed and cannot be modified.';
    } else if (lifecycle.stage === 'cancelled') {
      reason = 'This booking has been cancelled and cannot be modified.';
    }

    if (generalFormError) {
      generalFormError.innerHTML = `
        <div class="d-flex align-items-start gap-2">
          <i class="bi bi-lock-fill text-danger mt-1"></i>
          <div>
            <strong>Modification Not Available</strong><br>
            <span>${reason}</span>
          </div>
        </div>`;
      generalFormError.classList.remove('d-none');
    }

    // Disable the entire form so it is read-only
    const inputs = form ? form.querySelectorAll('input, select, textarea') : [];
    inputs.forEach(el => { el.disabled = true; });
    if (btnCheckAvailability) {
      btnCheckAvailability.disabled = true;
      btnCheckAvailability.style.opacity = '0.5';
    }
    // Do NOT return — let the page populate the booking reference details
    // so the user can see what they tried to modify.
  }
  // ╔══════════════════════════════════════════════════════════════════════════╗
  // ║  END STABLE BLOCK                                                        ║
  // ╚══════════════════════════════════════════════════════════════════════════╝

  // Populate reference details
  document.querySelector('.ref-badge').textContent = `Booking Reference: ${booking.id}`;
  
  // Current metadata display blocks
  const infoBlocks = document.querySelectorAll('.info-block');
  if (infoBlocks.length >= 4) {
    // Check-in
    infoBlocks[0].querySelector('span.fw-bold').textContent = booking.checkIn;
    infoBlocks[0].querySelector('span.small').textContent = booking.checkInDay || '';
    // Check-out
    infoBlocks[1].querySelector('span.fw-bold').textContent = booking.checkOut;
    infoBlocks[1].querySelector('span.small').textContent = booking.checkOutDay || '';
    // Guests
    const adultCount = booking.guests || booking.adultsCount || 1;
    const childCount = booking.children || booking.childrenCount || 0;
    infoBlocks[2].querySelector('span.fw-bold').textContent = `${adultCount} Adult(s)${childCount > 0 ? ', ' + childCount + ' Child' : ''}`;
    // Room Type
    infoBlocks[3].querySelector('span.fw-bold').textContent = booking.roomType || 'Classic Suite';
    infoBlocks[3].querySelector('span.small').textContent = booking.hotelName || 'Elegant Enclave';
  }

  // Pre-fill inputs with current stay dates
  const formatDateToIso = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const currentRoom = HotelState.getRoomsByHotel(booking.hotelId).find(r => r.id === booking.roomId) || {};
  const initialMaxGuests = currentRoom.capacity?.adults || 2;

  function regenerateGuestsDropdown(maxGuests) {
    if (!selectGuests) return;
    const currentSelVal = selectGuests.value;
    selectGuests.innerHTML = '';
    for (let i = 1; i <= maxGuests; i++) {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `${i} Guest${i > 1 ? 's' : ''}`;
      selectGuests.appendChild(opt);
    }
    const guestsError = document.getElementById('guestsError');
    if (parseInt(currentSelVal, 10) <= maxGuests) {
      selectGuests.value = currentSelVal || "1";
    } else {
      selectGuests.value = String(maxGuests);
      if (guestsError) {
        guestsError.textContent = `⚠️ Guest count automatically reset to max capacity (${maxGuests}).`;
        guestsError.classList.add('text-warning');
        guestsError.classList.remove('d-none', 'text-danger');
      }
    }
  }

  regenerateGuestsDropdown(initialMaxGuests);

  if (checkinInput) checkinInput.value = formatDateToIso(booking.checkIn);
  if (checkoutInput) checkoutInput.value = formatDateToIso(booking.checkOut);
  if (selectGuests) selectGuests.value = String(booking.guests || booking.adultsCount || 2);

  const datesSection = document.getElementById('datesSelectionSection');
  const roomSection = document.getElementById('roomSelectionSection');

  let selectedNewRoomId = booking.roomId;
  let isRoomsLoaded = false;

  // Calendar Validation Setup
  const todayDateObj = new Date();
  const todayIso = todayDateObj.toISOString().split('T')[0];
  
  if (checkinInput) {
    checkinInput.min = todayIso;
  }
  if (checkoutInput) {
    checkoutInput.min = todayIso;
  }

  function resetRoomsState() {
    isRoomsLoaded = false;
    roomSection.classList.add('d-none');
    btnCheckAvailability.innerHTML = 'Check Availability <i class="bi bi-arrow-right"></i>';
    // Restore original room selection when dates change to force user to review rooms again
    selectedNewRoomId = booking.roomId;
    regenerateGuestsDropdown(initialMaxGuests);
  }

  // Load available rooms from branch
  function loadAvailableRooms() {
    const listContainer = document.getElementById('availableRoomsList');
    if (!listContainer) return;

    listContainer.innerHTML = '';
    
    // Get unique rooms for the current branch/hotel ID
    const allRooms = HotelState.getRoomsByHotel(booking.hotelId);
    if (allRooms.length === 0) {
      listContainer.innerHTML = '<p class="text-muted">No rooms currently configured for this hotel branch.</p>';
      return;
    }

    // Identify current price
    const currentGrandTotal = booking.grandTotal || Number(booking.amount?.replace(/,/g, '') || 0);
    const nightsCount = booking.nights || 1;
    const currentPricePerNight = currentGrandTotal / nightsCount / 1.18; // approx pre-tax price

    allRooms.forEach(room => {
      const diffPrice = room.pricePerNight - currentPricePerNight;
      const displayDiff = diffPrice === 0 
        ? 'Same Price' 
        : (diffPrice > 0 ? `+₹${Math.round(diffPrice * nightsCount * 1.18).toLocaleString('en-IN')}` : `-₹${Math.round(Math.abs(diffPrice) * nightsCount * 1.18).toLocaleString('en-IN')}`);
      
      const isCurrent = (room.id === booking.roomId);
      
      const col = document.createElement('div');
      col.className = 'col-md-6';
      col.innerHTML = `
        <div class="card p-3 shadow-sm border ${isCurrent ? 'border-primary bg-light' : 'border-light'}" style="cursor: pointer;">
          <div class="form-check">
            <input class="form-check-input" type="radio" name="newRoomSelect" id="roomCheck_${room.id}" value="${room.id}" ${isCurrent ? 'checked' : ''}>
            <label class="form-check-label w-100" for="roomCheck_${room.id}">
              <strong class="d-block text-dark">${room.type}</strong>
              <span class="small text-muted d-block">Capacity: Max ${room.capacity.adults} Adults</span>
              <span class="fw-semibold text-purple font-serif">₹${room.pricePerNight.toLocaleString('en-IN')} / Night</span>
              <div class="mt-2 d-flex justify-content-between align-items-center">
                ${isCurrent ? '<span class="badge bg-purple text-white">Current Room</span>' : '<span class="small text-muted">Upgrade Difference</span>'}
                <strong class="${diffPrice > 0 ? 'text-danger' : (diffPrice < 0 ? 'text-success' : 'text-dark')}">${displayDiff}</strong>
              </div>
            </label>
          </div>
        </div>
      `;
      
      col.querySelector('.card').addEventListener('click', () => {
        listContainer.querySelectorAll('.card').forEach(c => {
          c.classList.remove('border-primary', 'bg-light');
          c.classList.add('border-light');
          const currentBadge = c.querySelector('.badge');
          if (currentBadge && currentBadge.textContent === 'Selected Room') {
            currentBadge.remove();
          }
        });
        col.querySelector('.card').classList.remove('border-light');
        col.querySelector('.card').classList.add('border-primary', 'bg-light');

        const input = col.querySelector('input[type="radio"]');
        input.checked = true;
        selectedNewRoomId = room.id;
        
        const rDetails = HotelState.getRoomsByHotel(booking.hotelId).find(x => x.id === room.id) || {};
        regenerateGuestsDropdown(rDetails.capacity?.adults || 2);
        
        validateFormState();
      });

      listContainer.appendChild(col);
    });

    // Default room selection
    const checked = listContainer.querySelector('input[type="radio"]:checked');
    if (checked) {
      selectedNewRoomId = checked.value;
    }
  }

  // Date Parsing & Validation
  function parseFormattedDate(str) {
    if (!str) return null;
    const d = new Date(str);
    if (isNaN(d.getTime())) return null;
    // Normalize UTC parsed date to local midnight
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  function validateFormState() {
    let isValid = true;
    // Verify Booking, Hotel, Room existence
    if (!bookingId || !booking) {
      return false;
    }
    const hotelObj = HotelState.getHotelById(booking.hotelId);
    if (!hotelObj) {
      return false;
    }
    const currentRoomObj = HotelState.getRoomsByHotel(booking.hotelId).find(r => r.id === booking.roomId);
    if (!currentRoomObj) {
      return false;
    }

    const guestsError = document.getElementById('guestsError');
    if (selectGuests && guestsError) {
      clearFieldStyles(selectGuests, guestsError);
      const targetRoom = HotelState.getRoomsByHotel(booking.hotelId).find(r => r.id === selectedNewRoomId);
      if (targetRoom) {
        const maxLimit = targetRoom.capacity?.adults || 2;
        const enteredVal = parseInt(selectGuests.value, 10);
        if (enteredVal > maxLimit) {
          isValid = false;
          selectGuests.classList.add('is-invalid');
          guestsError.textContent = '❌ Selected guests exceed room capacity.';
          guestsError.classList.add('text-danger');
          guestsError.classList.remove('d-none');
        } else {
          selectGuests.classList.add('is-valid');
        }
      }
    }

    clearFieldStyles(checkinInput, checkinError);
    clearFieldStyles(checkoutInput, checkoutError);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let checkinDate = null;
    let checkoutDate = null;

    if (!checkinInput.value) {
      isValid = false;
    } else {
      checkinDate = parseFormattedDate(checkinInput.value);
      if (!checkinDate || isNaN(checkinDate.getTime())) {
        isValid = false;
        checkinInput.classList.add('is-invalid');
        checkinError.textContent = '❌ Enter a valid check-in date.';
        checkinError.classList.add('text-danger');
        checkinError.classList.remove('d-none');
      } else if (checkinDate.getTime() < today.getTime()) {
        isValid = false;
        checkinInput.classList.add('is-invalid');
        checkinError.textContent = '❌ Check-in date cannot be in the past.';
        checkinError.classList.add('text-danger');
        checkinError.classList.remove('d-none');
      } else {
        checkinInput.classList.add('is-valid');
      }
    }

    if (!checkoutInput.value) {
      isValid = false;
    } else {
      checkoutDate = parseFormattedDate(checkoutInput.value);
      if (!checkoutDate || isNaN(checkoutDate.getTime())) {
        isValid = false;
        checkoutInput.classList.add('is-invalid');
        checkoutError.textContent = '❌ Enter a valid check-out date.';
        checkoutError.classList.add('text-danger');
        checkoutError.classList.remove('d-none');
      } else if (checkinDate && checkoutDate.getTime() <= checkinDate.getTime()) {
        isValid = false;
        checkoutInput.classList.add('is-invalid');
        checkoutError.textContent = '❌ Check-out date must be after check-in.';
        checkoutError.classList.add('text-danger');
        checkoutError.classList.remove('d-none');
      } else if (checkinDate && checkoutDate.getTime() > checkinDate.getTime()) {
        const diffDays = Math.ceil((checkoutDate.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 30) {
          isValid = false;
          checkoutInput.classList.add('is-invalid');
          checkoutError.textContent = '❌ Maximum stay duration is 30 nights.';
          checkoutError.classList.add('text-danger');
          checkoutError.classList.remove('d-none');
        } else {
          checkoutInput.classList.add('is-valid');
        }
      }
    }

    if (btnCheckAvailability) {
      if (isValid) {
        btnCheckAvailability.removeAttribute('disabled');
      } else {
        btnCheckAvailability.setAttribute('disabled', 'true');
      }
    }

    return isValid;
  }

  function clearFieldStyles(input, errorEl) {
    if (input) input.classList.remove('is-invalid', 'is-valid');
    if (errorEl) {
      errorEl.classList.add('d-none');
      errorEl.textContent = '';
      errorEl.classList.remove('text-danger', 'text-warning');
    }
  }

  if (checkinInput) {
    checkinInput.addEventListener('input', () => { resetRoomsState(); validateFormState(); });
    checkinInput.addEventListener('change', () => {
      const checkinVal = checkinInput.value;
      const checkoutVal = checkoutInput.value;
      if (checkinVal) {
        if (checkoutInput) checkoutInput.min = checkinVal;
      }
      if (checkinVal && checkoutVal) {
        const checkinD = parseFormattedDate(checkinVal);
        const checkoutD = parseFormattedDate(checkoutVal);
        if (checkinD && checkoutD && checkoutD.getTime() <= checkinD.getTime()) {
          checkoutInput.value = '';
          clearFieldStyles(checkoutInput, checkoutError);
        }
      }
      resetRoomsState();
      validateFormState();
    });
  }
  if (checkoutInput) {
    checkoutInput.addEventListener('input', () => { resetRoomsState(); validateFormState(); });
    checkoutInput.addEventListener('change', () => { resetRoomsState(); validateFormState(); });
  }
  if (selectGuests) {
    selectGuests.addEventListener('change', () => { resetRoomsState(); validateFormState(); });
  }

  // Reset Handler
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      checkinInput.value = formatDateToIso(booking.checkIn);
      checkoutInput.value = formatDateToIso(booking.checkOut);
      selectGuests.value = String(booking.guests || booking.adultsCount || 2);
      resetRoomsState();
      validateFormState();
    });
  }

  // Form Submit Handler
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!isRoomsLoaded) {
        if (validateFormState()) {
          roomSection.classList.remove('d-none');
          loadAvailableRooms();
          isRoomsLoaded = true;
          btnCheckAvailability.innerHTML = 'Review Changes <i class="bi bi-arrow-right"></i>';
          // re-validate once rooms are loaded to ensure room availability logic and identical-changes block runs
          validateFormState();
        }
      } else {
        // ---- IDENTICAL CHANGE CHECK: runs only on second submit ("Review Changes") ----
        const origCI = formatDateToIso(booking.checkIn);
        const origCO = formatDateToIso(booking.checkOut);
        const isNoChange = (
          checkinInput.value === origCI &&
          checkoutInput.value === origCO &&
          selectedNewRoomId === booking.roomId
        );
        if (isNoChange) {
          if (generalFormError) {
            generalFormError.textContent = '⚠️ No changes detected. Please select different stay dates or choose a different room to continue.';
            generalFormError.classList.remove('d-none');
          }
          return; // stop — do not proceed to policyModal
        }
        if (generalFormError) generalFormError.classList.add('d-none');

        if (validateFormState()) {
          const modContext = {
            modificationType: 'full',
            draftChanges: {
              checkIn: checkinInput.value,
              checkOut: checkoutInput.value,
              guests: parseInt(selectGuests.value, 10),
              newRoomId: selectedNewRoomId
            }
          };
          localStorage.setItem('bookingModificationContext', JSON.stringify(modContext));
          
          window.location.href = 'modify_booking_step2.html';
        }
      }
    });
  }

  validateFormState();
});
