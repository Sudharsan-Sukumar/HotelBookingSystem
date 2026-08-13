document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('stayDetailsForm');
  if (!form) return;

  const rawSelection = localStorage.getItem('hbs_booking_selection') || sessionStorage.getItem('hbs_booking_selection');
  if (!rawSelection) {
    window.location.href = '../hotels/search_results.html';
    return;
  }
  const selection = JSON.parse(rawSelection);

  // Pre-fill user data
  const userId = localStorage.getItem('userId');
  const user = HotelState.getUserById(userId);
  if (!user) {
    window.location.href = '../../features/Auth/login.html';
    return;
  }



  // 2. Inject Missing Guest Fields (Name, Email, ID Type, ID Number)
  const guestDetailsSection = document.querySelector('.form-section-block');
  if (guestDetailsSection) {
    const missingFieldsHtml = `
      <div class="mb-3 text-start">
        <label for="guestName" class="form-label">Primary Guest Name <span class="text-danger">*</span></label>
        <div class="input-group d-flex flex-nowrap align-items-center custom-input-group">
          <span class="input-group-text bg-white border-end-0"><i class="bi bi-person text-muted"></i></span>
          <input type="text" id="guestName" class="form-control border-start-0" value="${user.firstName} ${user.lastName}" required>
        </div>
      </div>
      <div class="mb-3 text-start">
        <label for="guestEmail" class="form-label">Email Address <span class="text-danger">*</span></label>
        <div class="input-group d-flex flex-nowrap align-items-center custom-input-group">
          <span class="input-group-text bg-white border-end-0"><i class="bi bi-envelope text-muted"></i></span>
          <input type="email" id="guestEmail" class="form-control border-start-0" value="${user.email}" required>
        </div>
      </div>
      <div class="row g-4 text-start mb-3">
        <div class="col-md-6">
          <label for="guestIdType" class="form-label">ID Type <span class="text-danger">*</span></label>
          <select id="guestIdType" class="form-select custom-input-group p-2" required>
            <option value="">Select ID Type</option>
            <option value="Aadhaar">Aadhaar</option>
            <option value="Passport">Passport</option>
            <option value="PAN">PAN</option>
          </select>
        </div>
        <div class="col-md-6">
          <label for="guestIdNumber" class="form-label">ID Number <span class="text-danger">*</span></label>
          <div class="input-group d-flex flex-nowrap align-items-center custom-input-group">
            <span class="input-group-text bg-white border-end-0"><i class="bi bi-card-text text-muted"></i></span>
            <input type="text" id="guestIdNumber" class="form-control border-start-0" placeholder="Enter ID Number" required>
          </div>
          <div class="text-danger small mt-1 d-none" id="guestIdNumberErrorMsg"></div>
        </div>
      </div>
    `;
    guestDetailsSection.insertAdjacentHTML('beforeend', missingFieldsHtml);
  }

  // Bind existing elements
  const guestCount = document.getElementById('guestCount');
  const guestPhone = document.getElementById('guestPhone');
  const checkinDate = document.getElementById('checkinDate');
  const checkoutDate = document.getElementById('checkoutDate');
  const specialRequests = document.getElementById('specialRequests');
  const charCounter = document.getElementById('charCounter');
  const btnConfirmBooking = document.getElementById('btnConfirmBooking');

  // Pre-fill phone and dates
  // Retrieve selected room and calculate dynamic capacity limit
  const roomObj = HotelState.getRoomById(selection.roomId) || JSON.parse(localStorage.getItem('hbs_selected_room'));
  const maxOccupancy = roomObj && roomObj.capacity ? (roomObj.capacity.adults || 2) + (roomObj.capacity.children || 0) : 4;

  // Display maximum occupancy dynamically
  const capacityBadge = document.getElementById('capacityBadge');
  if (capacityBadge) {
    capacityBadge.textContent = `Max ${maxOccupancy} Guest${maxOccupancy > 1 ? 's' : ''}`;
  }
  if (guestCount) {
    guestCount.setAttribute('max', maxOccupancy);
  }

  // Setup minimum selectable checkin date to today
  const todayStr = new Date().toISOString().split('T')[0];
  if (checkinDate) {
    checkinDate.setAttribute('min', todayStr);
    checkinDate.value = selection.checkIn || '';
  }
  if (checkoutDate) {
    checkoutDate.value = selection.checkOut || '';
  }
  if (guestCount) guestCount.value = (selection.adults || 1) + (selection.children || 0);

  if (guestPhone) guestPhone.value = user.phone || '';

  // Clean-up and validate checkin changes
  if (checkinDate) {
    checkinDate.addEventListener('change', () => {
      if (checkoutDate && checkoutDate.value) {
        const checkinObj = new Date(checkinDate.value);
        const checkoutObj = new Date(checkoutDate.value);
        if (checkoutObj <= checkinObj) {
          checkoutDate.value = '';
        }
      }
      validateForm();
    });
  }

  function validateStayDates() {
    if (!checkinDate || !checkoutDate) return false;
    
    const checkinErr = document.getElementById('checkinErrorMsg');
    const checkoutErr = document.getElementById('checkoutErrorMsg');
    const dateErr = document.getElementById('dateErrorMsg');
    
    if (checkinErr) { checkinErr.classList.add('d-none'); checkinErr.textContent = ''; }
    if (checkoutErr) { checkoutErr.classList.add('d-none'); checkoutErr.textContent = ''; }
    if (dateErr) { dateErr.classList.add('d-none'); dateErr.textContent = ''; }
    
    if (!checkinDate.value) {
      if (checkinErr) { checkinErr.textContent = 'Check-in date is mandatory.'; checkinErr.classList.remove('d-none'); }
      return false;
    }
    if (!checkoutDate.value) {
      if (checkoutErr) { checkoutErr.textContent = 'Check-out date is mandatory.'; checkoutErr.classList.remove('d-none'); }
      return false;
    }
    
    const checkinObj = new Date(checkinDate.value);
    const checkoutObj = new Date(checkoutDate.value);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const checkinTime = new Date(checkinObj.getFullYear(), checkinObj.getMonth(), checkinObj.getDate());
    const checkoutTime = new Date(checkoutObj.getFullYear(), checkoutObj.getMonth(), checkoutObj.getDate());
    const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (checkinTime < todayTime) {
      if (checkinErr) { checkinErr.textContent = 'Check-in date cannot be in the past.'; checkinErr.classList.remove('d-none'); }
      return false;
    }
    
    if (checkoutTime <= checkinTime) {
      if (checkoutErr) { checkoutErr.textContent = 'Check-out date must be after check-in date.'; checkoutErr.classList.remove('d-none'); }
      return false;
    }
    
    const diffTime = Math.abs(checkoutTime - checkinTime);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 30) {
      if (checkoutErr) { checkoutErr.textContent = 'Maximum stay per booking is 30 nights.'; checkoutErr.classList.remove('d-none'); }
      return false;
    }
    
    // Dates valid, recalculate values
    selection.checkIn = checkinDate.value;
    selection.checkOut = checkoutDate.value;
    selection.nights = diffDays;
    selection.totalAmount = selection.pricePerNight * diffDays;
    selection.taxAmount = selection.totalAmount * 0.18;
    selection.grandTotal = selection.totalAmount + selection.taxAmount;
    
    localStorage.setItem('hbs_booking_selection', JSON.stringify(selection));
    sessionStorage.setItem('hbs_booking_selection', JSON.stringify(selection));
    
    return true;
  }

  // Validate form to enable/disable button
  function validateForm() {
    let isValid = true;
    
    // Validate stay dates
    const datesValid = validateStayDates();
    if (!datesValid) isValid = false;
    
    // Real-time capacity error message
    const guestErrorMsg = document.getElementById('guestErrorMsg');
    const countVal = guestCount ? parseInt(guestCount.value) : 0;
    
    if (guestCount && (isNaN(countVal) || countVal < 1 || countVal > maxOccupancy)) {
      isValid = false;
      if (guestErrorMsg) {
        if (countVal < 1) {
          guestErrorMsg.textContent = 'Minimum capacity is 1.';
        } else {
          guestErrorMsg.textContent = `Guest count exceeds room capacity of ${maxOccupancy} guest${maxOccupancy > 1 ? 's' : ''}.`;
        }
        guestErrorMsg.classList.remove('d-none');
      }
    } else {
      if (guestErrorMsg) {
        guestErrorMsg.classList.add('d-none');
      }
    }

    if (!guestCount || !guestCount.value || isNaN(countVal) || countVal < 1 || countVal > maxOccupancy) isValid = false;
    if (!guestPhone || guestPhone.value.length < 10) isValid = false;

    // Injected fields
    const gName = document.getElementById('guestName');
    const gEmail = document.getElementById('guestEmail');
    const gIdType = document.getElementById('guestIdType');
    const gIdNum = document.getElementById('guestIdNumber');
    const gIdError = document.getElementById('guestIdNumberErrorMsg');
    
    if (!gName || !gName.value.trim()) isValid = false;
    if (!gEmail || !gEmail.value.trim() || !gEmail.value.includes('@')) isValid = false;
    
    let isIdValid = true;
    if (gIdType && gIdNum) {
      const type = gIdType.value;
      let rawVal = gIdNum.value.trim();
      
      if (!type) {
        isIdValid = false;
      } else {
        if (type === 'Aadhaar') {
          // Automatic removal of spaces and hyphens for Aadhaar before validation
          const cleanAadhaar = rawVal.replace(/[\s-]/g, '');
          if (cleanAadhaar.length === 0) {
            isIdValid = false;
          } else if (!/^\d+$/.test(cleanAadhaar)) {
            isIdValid = false;
            if (gIdError) {
              gIdError.textContent = 'Only numeric characters are allowed.';
              gIdError.classList.remove('d-none');
            }
          } else if (cleanAadhaar.length !== 12) {
            isIdValid = false;
            if (gIdError) {
              gIdError.textContent = 'Aadhaar number must contain exactly 12 digits.';
              gIdError.classList.remove('d-none');
            }
          } else {
            if (gIdError) gIdError.classList.add('d-none');
          }
        } else if (type === 'PAN') {
          if (rawVal.length === 0) {
            isIdValid = false;
          } else if (!/^[A-Z]{5}\d{4}[A-Z]{1}$/.test(rawVal)) {
            isIdValid = false;
            if (gIdError) {
              gIdError.textContent = 'Enter a valid PAN number (Example: ABCDE1234F).';
              gIdError.classList.remove('d-none');
            }
          } else {
            if (gIdError) gIdError.classList.add('d-none');
          }
        } else if (type === 'Passport') {
          if (rawVal.length === 0) {
            isIdValid = false;
          } else if (!/^[A-Z]{1}\d{7}$/.test(rawVal)) {
            isIdValid = false;
            if (gIdError) {
              gIdError.textContent = 'Enter a valid Passport number (Example: A1234567).';
              gIdError.classList.remove('d-none');
            }
          } else {
            if (gIdError) gIdError.classList.add('d-none');
          }
        }
      }
    } else {
      isIdValid = false;
    }

    if (!isIdValid) isValid = false;

    if (isValid) {
      btnConfirmBooking.removeAttribute('disabled');
    } else {
      btnConfirmBooking.setAttribute('disabled', 'true');
    }
  }

  // Attach input listeners
  form.querySelectorAll('input, select').forEach(el => {
    el.addEventListener('input', validateForm);
    el.addEventListener('change', validateForm);
  });

  const gIdType = document.getElementById('guestIdType');
  const gIdNum = document.getElementById('guestIdNumber');
  const gIdError = document.getElementById('guestIdNumberErrorMsg');

  if (gIdType && gIdNum) {
    gIdType.addEventListener('change', () => {
      gIdNum.value = '';
      if (gIdError) {
        gIdError.classList.add('d-none');
        gIdError.textContent = '';
      }
      
      const type = gIdType.value;
      if (type === 'Aadhaar') {
        gIdNum.placeholder = 'Enter 12-digit Aadhaar Number';
      } else if (type === 'PAN') {
        gIdNum.placeholder = 'Enter PAN Number';
      } else if (type === 'Passport') {
        gIdNum.placeholder = 'Enter Passport Number';
      } else {
        gIdNum.placeholder = 'Enter ID Number';
      }
      validateForm();
    });

    gIdNum.addEventListener('input', () => {
      let val = gIdNum.value;
      const type = gIdType.value;

      if (type === 'PAN' || type === 'Passport') {
        val = val.toUpperCase();
      }
      
      gIdNum.value = val;
      validateForm();
    });
  }
  
  if (specialRequests && charCounter) {
    specialRequests.addEventListener('input', () => {
      charCounter.textContent = `${specialRequests.value.length} / 300`;
    });
  }

  // Initial validate
  validateForm();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const guestObj = {
      primaryGuest: {
        name: document.getElementById('guestName').value.trim(),
        email: document.getElementById('guestEmail').value.trim(),
        phone: guestPhone.value.trim(),
        idType: document.getElementById('guestIdType').value,
        idNumber: document.getElementById('guestIdNumber').value.trim(),
      },
      specialRequests: specialRequests ? specialRequests.value.trim() : ''
    };
    
    // Update selection object dates just in case they were modified
    selection.checkIn = checkinDate.value;
    selection.checkOut = checkoutDate.value;
    sessionStorage.setItem('hbs_booking_selection', JSON.stringify(selection));
    localStorage.setItem('hbs_booking_selection', JSON.stringify(selection));

    // Save guest details
    sessionStorage.setItem('hbs_booking_guest', JSON.stringify(guestObj));
    localStorage.setItem('hbs_booking_guest', JSON.stringify(guestObj));
    
    // Route to invoice summary
    window.location.href = 'invoice_summary.html';
  });

});
