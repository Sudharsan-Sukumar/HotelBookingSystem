document.addEventListener('DOMContentLoaded', () => {
  // Resolve current logged-in user from HotelState (app stores user in hbs_state_currentUser, not raw 'userId')
  const currentUser = (window.HotelState && HotelState.currentUser) ? HotelState.currentUser : null;
  const userId = currentUser ? (currentUser.id || currentUser.email || '') : '';
  if (!currentUser || !currentUser.email) {
    window.location.href = '../Auth/login.html';
    return;
  }

  // Retrieve parameters
  const bookingId = localStorage.getItem('selectedBookingId');
  const modContextStr = localStorage.getItem('bookingModificationContext');

  if (!bookingId || !modContextStr) {
    document.body.innerHTML = '<div class="container mt-5"><div class="alert alert-danger text-center">No modification session active. <br><br><a href="../../Features/User/Candidate/my_bookings.html" class="btn btn-primary">Return to My Bookings</a></div></div>';
    return;
  }
  const modContext = JSON.parse(modContextStr);
  const modifyType = modContext.modificationType;

  const bookings = HotelState.bookings;
  const booking = bookings.find(b => b.id === bookingId);
  if (!booking) {
    document.body.innerHTML = '<div class="container mt-5"><div class="alert alert-danger text-center">Booking record not found. <br><br><a href="../../Features/User/Candidate/my_bookings.html" class="btn btn-primary">Return to My Bookings</a></div></div>';
    return;
  }

  // References to UI comparison elements — use IDs for reliable, dynamic binding
  const currentTotalEl   = document.getElementById('lblCurrentAmount');
  const currentNightsEl  = document.getElementById('lblCurrentNights');
  const newTotalEl       = document.getElementById('lblNewAmount');
  const newNightsEl      = document.getElementById('lblNewNights');
  const diffAmountEl     = document.getElementById('lblDiffAmount');
  const diffTitle        = document.querySelector('.bg-light-ivory strong');
  const diffDesc         = document.querySelector('.bg-light-ivory .small');
  const labelMathSymbol  = document.getElementById('lblEqualsSymbol'); // equals symbol (right of New col)

  const btnContinueConfirmation = document.getElementById('btnContinueConfirmation');

  // Populate dynamic header text
  document.querySelector('.ref-badge').textContent = `Booking Reference: ${booking.id}`;

  // Fill current values for reference
  const oldGrandTotal = booking.grandTotal || Number(booking.amount?.replace(/,/g, '') || 0);
  if (currentTotalEl) currentTotalEl.textContent = oldGrandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  if (currentNightsEl) currentNightsEl.textContent = `For ${booking.nights || 1} Night(s)`;

  // Fill current summary info blocks
  const infoBlocks = document.querySelectorAll('.info-block');
  if (infoBlocks.length >= 4) {
    infoBlocks[0].querySelector('span.fw-bold').textContent = booking.checkIn;
    infoBlocks[0].querySelector('span.small').textContent = booking.checkInDay || '';
    infoBlocks[1].querySelector('span.fw-bold').textContent = booking.checkOut;
    infoBlocks[1].querySelector('span.small').textContent = booking.checkOutDay || '';
    
    const adultCount = booking.guests || booking.adultsCount || 1;
    const childCount = booking.children || booking.childrenCount || 0;
    infoBlocks[2].querySelector('span.fw-bold').textContent = `${adultCount} Adult(s)${childCount > 0 ? ', ' + childCount + ' Child' : ''}`;
    
    infoBlocks[3].querySelector('span.fw-bold').textContent = booking.roomType || 'Classic Suite';
    infoBlocks[3].querySelector('span.small').textContent = booking.hotelName || 'Elegant Enclave';
  }

  // Calculate new details based on modification choice
  let newCheckIn = booking.checkIn;
  let newCheckOut = booking.checkOut;
  let newGuests = booking.guests || booking.adultsCount || 2;
  let newNights = booking.nights || 1;
  let newRoomId = booking.roomId;
  let newRoomType = booking.roomType || 'Classic Suite';
  let newPricePerNight = 0;

  const currentRoom = HotelState.getRoomsByHotel(booking.hotelId).find(r => r.id === booking.roomId) || {};
  newPricePerNight = currentRoom.pricePerNight || 0;

  if (modContext.draftChanges) {
    if (modContext.draftChanges.checkIn) {
      const rawCheckIn = modContext.draftChanges.checkIn;
      const rawCheckOut = modContext.draftChanges.checkOut;
      newCheckIn = new Date(rawCheckIn).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
      newCheckOut = new Date(rawCheckOut).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
      newGuests = modContext.draftChanges.guests || 2;
      newNights = Math.round((new Date(rawCheckOut) - new Date(rawCheckIn)) / (1000 * 60 * 60 * 24));
    }
    if (modContext.draftChanges.newRoomId) {
      newRoomId = modContext.draftChanges.newRoomId;
      const newRoom = HotelState.getRoomsByHotel(booking.hotelId).find(r => r.id === newRoomId);
      if (newRoom) {
        newRoomType = newRoom.type;
        newPricePerNight = newRoom.pricePerNight;
      }
    }
  }

  const newTotalAmount = newPricePerNight * newNights;
  const newTaxAmount = newTotalAmount * 0.18;
  const newGrandTotal = newTotalAmount + newTaxAmount;
  const priceDiff = newGrandTotal - oldGrandTotal;

  // Render the option cards to show ONLY the chosen modification selection
  const card1 = document.getElementById('cardOption1Container');
  const card2 = document.getElementById('cardOption2Container');
  const card3 = document.getElementById('cardOption3Container');

  // Hide 2 and 3, dynamically populate Card 1 with the target modification comparison
  if (card2) card2.style.display = 'none';
  if (card3) card3.style.display = 'none';

  if (card1) {
    const badgeEl = card1.querySelector('.badge');
    if (badgeEl) badgeEl.textContent = 'Stay Modification Details';

    const optionTitleEl = card1.querySelector('.option-title');
    if (optionTitleEl) optionTitleEl.textContent = newRoomType;

    const dateDescEl = card1.querySelector('p.small');
    if (dateDescEl) dateDescEl.textContent = `Dates: ${newCheckIn} \u2014 ${newCheckOut} (${newNights} Nights) at ${booking.hotelName}.`;

    // Update guest count (2nd span inside the meta row)
    const metaSpans = card1.querySelectorAll('.d-flex.gap-3 span');
    if (metaSpans.length >= 2) metaSpans[1].textContent = `\u{1F465} Up to ${newGuests} Guests`;

    const priceBox = card1.querySelector('.price-box');
    if (priceBox) {
      const priceTitleEl = priceBox.querySelector('strong');
      if (priceTitleEl) priceTitleEl.textContent = `New Total for ${newNights} Nights`;

      const grandTotalEl = priceBox.querySelector('span.fw-bold');
      if (grandTotalEl) grandTotalEl.textContent = newGrandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

      // Use querySelectorAll to safely index small spans — avoids :nth-of-type crash
      const smallSpans = priceBox.querySelectorAll('span.small');
      const avgNightEl = smallSpans[0];
      const diffTextEl = smallSpans[1];

      const displayDiffText = priceDiff === 0
        ? 'No price difference'
        : (priceDiff > 0
          ? `+\u20B9${Math.round(priceDiff).toLocaleString('en-IN')} additional payment required`
          : `-\u20B9${Math.round(Math.abs(priceDiff)).toLocaleString('en-IN')} refund eligible`);

      if (avgNightEl) avgNightEl.textContent = `Avg \u20B9${Math.round(newPricePerNight * 1.18).toLocaleString('en-IN')} / Night`;
      if (diffTextEl) {
        diffTextEl.textContent = displayDiffText;
        diffTextEl.className = priceDiff > 0
          ? 'small text-danger fw-bold d-block mt-1'
          : (priceDiff < 0 ? 'small text-success fw-bold d-block mt-1' : 'small text-muted fw-bold d-block mt-1');
      }
    }
  }


  // Populate dynamic price summary footer
  if (newTotalEl) newTotalEl.textContent = newGrandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  if (newNightsEl) newNightsEl.textContent = `For ${newNights} Night(s)`;

  if (diffAmountEl) {
    diffAmountEl.textContent = Math.abs(priceDiff).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    if (priceDiff > 0) {
      diffAmountEl.className = "fw-bold text-danger font-serif fs-3";
      if (diffTitle) diffTitle.textContent = "Additional Amount (+)";
      if (diffDesc) diffDesc.textContent = "To be paid via secure gateway";
      if (labelMathSymbol) labelMathSymbol.className = "bi bi-plus-lg text-danger";
    } else if (priceDiff < 0) {
      diffAmountEl.className = "fw-bold text-success font-serif fs-3";
      if (diffTitle) diffTitle.textContent = "Refund Amount (-)";
      if (diffDesc) diffDesc.textContent = "To be credited to original payment source";
      if (labelMathSymbol) labelMathSymbol.className = "bi bi-distribute-vertical text-success";
    } else {
      diffAmountEl.className = "fw-bold text-dark font-serif fs-3";
      if (diffTitle) diffTitle.textContent = "Price Difference";
      if (diffDesc) diffDesc.textContent = "No charge adjustments required";
      if (labelMathSymbol) labelMathSymbol.className = "bi bi-check-all text-success";
    }
  }

  // Populate success alert banner
  const successBanner = document.querySelector('.success-alert-banner');
  if (successBanner) {
    if (priceDiff > 0) {
      successBanner.querySelector('strong').textContent = 'Additional Payment Required';
      successBanner.querySelector('.small').textContent = `An extra amount of ₹${Math.round(priceDiff).toLocaleString('en-IN')} is required to confirm changes.`;
      successBanner.className = 'success-alert-banner p-3 d-flex align-items-center gap-3 text-start bg-danger-light border-danger';
    } else if (priceDiff < 0) {
      successBanner.querySelector('strong').textContent = 'Refund Eligible';
      successBanner.querySelector('.small').textContent = `Your modification results in a price decrease. A refund of ₹${Math.round(Math.abs(priceDiff)).toLocaleString('en-IN')} will be processed.`;
      successBanner.className = 'success-alert-banner p-3 d-flex align-items-center gap-3 text-start bg-success-light border-success';
    } else {
      successBanner.querySelector('strong').textContent = 'No Price Adjustment';
      successBanner.querySelector('.small').textContent = 'Your stay dates/room changes are free. No payment adjustment is required.';
      successBanner.className = 'success-alert-banner p-3 d-flex align-items-center gap-3 text-start bg-primary-light border-primary';
    }
  }

  // Save calculated figures to localStorage modification context
  modContext.draftChanges.calculated = {
    newCheckIn,
    newCheckOut,
    newNights,
    newGrandTotal,
    newTotalAmount,
    newTaxAmount,
    priceDiff,
    newRoomType,
    newRoomId,
    newGuests
  };
  localStorage.setItem('bookingModificationContext', JSON.stringify(modContext));

  // Navigate to Step 3 Confirmation Page
  if (btnContinueConfirmation) {
    btnContinueConfirmation.addEventListener('click', () => {
      window.location.href = 'modify_booking_step3.html';
    });
  }
});
