const HBS_API_BASE = 'http://localhost:5031';

document.addEventListener('DOMContentLoaded', () => {
  // Determine if this is a modification payment or a fresh booking payment
  const isModification = sessionStorage.getItem('isModification') === 'true';

  const rawSelection = localStorage.getItem('hbs_booking_selection') || sessionStorage.getItem('hbs_booking_selection');
  const rawGuest = localStorage.getItem('hbs_booking_guest') || sessionStorage.getItem('hbs_booking_guest');
  
  // For modifications we don't require guest details (booking already has them)
  if (!rawSelection || (!rawGuest && !isModification)) {
    window.location.href = '../hotels/search_results.html';
    return;
  }
  
  const selection = JSON.parse(rawSelection);
  const guestDetails = rawGuest ? JSON.parse(rawGuest) : null;

  // Resolve userId from HotelState (app never writes a raw 'userId' key to localStorage)
  const currentUser = (window.HotelState && HotelState.currentUser) ? HotelState.currentUser : {};
  const userId = currentUser.id || currentUser.email || '';
  
  
  const hotel = HotelState.getHotelById(selection.hotelId);
  const room = HotelState.getRoomsByHotel(selection.hotelId).find(r => r.id === selection.roomId);
  
  if (!hotel || !room) {
    window.location.href = '../hotels/search_results.html';
    return;
  }

  // Populate Booking Summary Sidebar
  document.getElementById('summaryHotelName').textContent = hotel.name;
  document.getElementById('summaryHotelImg').src = hotel.imageUrl || hotel.image || '';
  const branchName = hotel.location ? hotel.location.split(',')[0].trim() : 'Coimbatore';
  document.getElementById('summaryHotelBranchRoom').textContent = `${branchName} Branch • ${room.type} Room`;
  
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  document.getElementById('summaryCheckIn').textContent = new Date(selection.checkIn).toLocaleDateString('en-US', options);
  document.getElementById('summaryCheckOut').textContent = new Date(selection.checkOut).toLocaleDateString('en-US', options);
  document.getElementById('summaryDuration').textContent = `${selection.nights} Nights`;
  document.getElementById('summaryGuests').textContent = `${(selection.adults || 1) + (selection.children || 0)} Guests`;
  document.getElementById('summaryBookingId').textContent = 'Pending...';
  
  document.getElementById('summaryBaseCharge').textContent = selection.totalAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  document.getElementById('summaryTaxes').textContent = selection.taxAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  document.getElementById('summaryTotalAmount').textContent = selection.grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });


  // ── Determine exact amount to charge ──────────────────────────────────────
  // For modifications: charge only the price difference (priceDiff stored in selection)
  // For new bookings : charge the full grandTotal
  const amountToPay = isModification
    ? (selection.priceDiff > 0 ? selection.priceDiff : selection.grandTotal)
    : selection.grandTotal;

  // ── Populate left-panel amount display ────────────────────────────────────
  const lblRazorpayAmount = document.getElementById('lblRazorpayAmount');
  const lblPaymentLabel   = document.getElementById('lblPaymentLabel');
  const lblPaymentNote    = document.getElementById('lblPaymentNote');
  const lblPrefillName    = document.getElementById('lblPrefillName');
  const lblPrefillEmail   = document.getElementById('lblPrefillEmail');

  const displayName  = currentUser.name || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Guest';
  const displayEmail = currentUser.email || '';

  if (lblRazorpayAmount) lblRazorpayAmount.textContent = amountToPay.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  if (lblPaymentLabel)   lblPaymentLabel.textContent   = isModification ? 'Additional Amount Due' : 'Total Amount Due';
  if (lblPaymentNote)    lblPaymentNote.textContent    = isModification
    ? 'Booking modification · Additional charge inclusive of GST'
    : `New booking · ${selection.nights} Night(s) · Inclusive of 18% GST`;
  if (lblPrefillName)    lblPrefillName.textContent    = displayName;
  if (lblPrefillEmail)   lblPrefillEmail.textContent   = displayEmail;

  // ── Track selected method for completeBooking() ────────────────────────────
  let selectedMethod = 'Razorpay';

  // ── Razorpay checkout (real order, phone capture, opens in a new tab) ─────
  const btnPayRazorpay   = document.getElementById('btnPayRazorpay');
  const btnPayText       = document.getElementById('btnPayRazorpayText');
  const phoneModalEl     = document.getElementById('phoneNumberModal');
  const phoneModal       = phoneModalEl ? new bootstrap.Modal(phoneModalEl) : null;
  const phoneForm        = document.getElementById('phoneNumberForm');
  const inputPhoneNumber = document.getElementById('inputPhoneNumber');
  const phoneNumberError = document.getElementById('phoneNumberError');
  const btnPhoneContinue = document.getElementById('btnPhoneContinue');

  let rzpPollTimer = null;
  let rzpPaymentReference = null;

  function resetPayButton() {
    if (btnPayRazorpay) btnPayRazorpay.disabled = false;
    if (btnPayText) btnPayText.textContent = 'Pay Securely with Razorpay';
  }

  function showPaymentFailure(reason) {
    resetPayButton();
    const failModal = new bootstrap.Modal(document.getElementById('paymentFailedModal'));
    const failReason = document.getElementById('lblFailReason');
    if (failReason) failReason.textContent = reason || 'Payment was declined. Please try again.';
    failModal.show();
  }

  function stopPollingForResult() {
    if (rzpPollTimer) { clearInterval(rzpPollTimer); rzpPollTimer = null; }
    window.removeEventListener('storage', onStorageResult);
  }

  function handleRazorpayResult(result) {
    if (!result) return;
    stopPollingForResult();

    if (result.status === 'paid') {
      selectedMethod = 'Razorpay';
      const overlay = document.getElementById('paymentProgressOverlay');
      if (overlay) overlay.classList.remove('d-none');
      setTimeout(() => completeBooking(), 1200);
    } else if (result.status === 'failed') {
      showPaymentFailure(result.reason);
    } else if (result.status === 'cancelled') {
      resetPayButton();
    }
  }

  function onStorageResult(e) {
    if (!rzpPaymentReference || e.key !== `hbs_rzp_result_${rzpPaymentReference}`) return;
    try { handleRazorpayResult(JSON.parse(e.newValue)); } catch (_) {}
  }

  function beginPollingForResult(reference) {
    rzpPaymentReference = reference;
    window.addEventListener('storage', onStorageResult);
    // Poll too, in case the storage event doesn't fire (e.g. same-tab quirks / browser differences)
    rzpPollTimer = setInterval(() => {
      const raw = localStorage.getItem(`hbs_rzp_result_${reference}`);
      if (raw) {
        try { handleRazorpayResult(JSON.parse(raw)); } catch (_) {}
      }
    }, 1500);
  }

  if (btnPayRazorpay && phoneModal) {
    btnPayRazorpay.addEventListener('click', () => {
      if (phoneNumberError) phoneNumberError.style.setProperty('display', 'none', 'important');
      if (inputPhoneNumber) inputPhoneNumber.value = currentUser.phone || currentUser.mobile || '';
      phoneModal.show();
    });
  }

  if (phoneForm) {
    phoneForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const phone = (inputPhoneNumber?.value || '').trim();
      if (!/^[6-9]\d{9}$/.test(phone)) {
        if (phoneNumberError) {
          phoneNumberError.textContent = 'Enter a valid 10-digit mobile number.';
          phoneNumberError.style.setProperty('display', 'block', 'important');
        }
        return;
      }

      btnPhoneContinue.disabled = true;
      btnPhoneContinue.textContent = 'Creating order…';

      const reference = `RZP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Open the tab synchronously, still inside the user-gesture call stack, so real
      // browsers don't treat it as a blocked popup once we `await` the order-creation call below.
      const checkoutTab = window.open('about:blank', '_blank');
      if (!checkoutTab) {
        btnPhoneContinue.disabled = false;
        btnPhoneContinue.textContent = 'Continue to Razorpay';
        showPaymentFailure('Your browser blocked the new tab. Please allow pop-ups for this site and try again.');
        return;
      }

      try {
        const orderResp = await fetch(`${HBS_API_BASE}/api/razorpay/order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference, phoneNumber: phone, amount: amountToPay })
        });

        if (!orderResp.ok) {
          const err = await orderResp.json().catch(() => ({}));
          throw new Error(err.message || 'Could not create Razorpay order.');
        }

        const order = await orderResp.json();

        // Hand the checkout page everything it needs via localStorage (shared across tabs on this origin)
        localStorage.setItem(`hbs_rzp_order_${reference}`, JSON.stringify({
          orderId: order.orderId,
          amountPaise: order.amountPaise,
          currency: order.currency,
          keyId: order.keyId,
          name: 'Elegant Enclave',
          description: isModification
            ? `Booking Modification – ${sessionStorage.getItem('modify_bookingId') || localStorage.getItem('selectedBookingId') || ''}`
            : `Room Booking – ${hotel.name} · ${room.type}`,
          prefillName: displayName,
          prefillEmail: displayEmail,
          prefillContact: phone,
          apiBase: HBS_API_BASE
        }));

        phoneModal.hide();
        btnPayRazorpay.disabled = true;
        if (btnPayText) btnPayText.textContent = 'Waiting for payment in the new tab…';

        // Requirement: Razorpay Checkout opens in a NEW browser tab, not this one.
        // The tab was already opened synchronously (see above) to avoid popup-blocker issues;
        // now that the order exists, point it at the checkout page.
        const checkoutUrl = new URL('razorpay_checkout.html', window.location.href);
        checkoutUrl.searchParams.set('ref', reference);
        checkoutTab.location.href = checkoutUrl.toString();

        beginPollingForResult(reference);
      } catch (err) {
        checkoutTab.close();
        showPaymentFailure(err.message);
      } finally {
        btnPhoneContinue.disabled = false;
        btnPhoneContinue.textContent = 'Continue to Razorpay';
      }
    });
  }

  // Retry button in the failure modal re-triggers Razorpay
  const btnRetryPayment = document.getElementById('btnRetryPayment');
  if (btnRetryPayment) {
    btnRetryPayment.addEventListener('click', () => {
      const failModal = bootstrap.Modal.getInstance(document.getElementById('paymentFailedModal'));
      if (failModal) failModal.hide();
      setTimeout(() => btnPayRazorpay?.click(), 400);
    });
  }







  function completeBooking() {
    if (isModification) {
      // Prefer sessionStorage key set by step3, fall back to localStorage selectedBookingId
      const targetId = sessionStorage.getItem('modify_bookingId') || localStorage.getItem('selectedBookingId');
      const bList = HotelState.bookings;
      const bIdx = bList.findIndex(b => b.id === targetId);
      if (bIdx !== -1) {
        const oldB = bList[bIdx];
        const userObj = HotelState.getUserById(userId);
        const userName = userObj ? `${userObj.firstName} ${userObj.lastName}` : (currentUser.name || 'Customer');
        
        if (oldB.roomId !== selection.roomId) {
          HotelState.updateRoomStatus(oldB.roomId, 'Available');
          HotelState.updateRoomStatus(selection.roomId, 'Occupied');
        }

        let actionMsg = "";
        let prevVal = "";
        let newVal = "";
        if (sessionStorage.getItem('modify_type') === 'dates') {
          actionMsg = "Stay Dates Modified";
          prevVal = `Dates: ${oldB.checkIn} to ${oldB.checkOut}`;
          newVal = `Dates: ${selection.checkIn} to ${selection.checkOut}`;
          oldB.checkIn = new Date(selection.checkIn).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
          oldB.checkOut = new Date(selection.checkOut).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
          oldB.checkInDay = new Date(selection.checkIn).toLocaleDateString('en-US', { weekday: 'long' });
          oldB.checkOutDay = new Date(selection.checkOut).toLocaleDateString('en-US', { weekday: 'long' });
          oldB.nights = selection.nights;
          oldB.guests = selection.adults;
          oldB.adultsCount = selection.adults;
          oldB.childrenCount = selection.children || 0;
        } else {
          actionMsg = "Room Type Modified";
          prevVal = `Room: ${oldB.roomType} (ID: ${oldB.roomId})`;
          newVal = `Room: ${room.type} (ID: ${room.id})`;
          oldB.roomId = selection.roomId;
          oldB.roomType = room.type;
        }

        const oldGrandTotal = oldB.grandTotal || Number(oldB.amount?.replace(/,/g, '') || 0);
        const diffAmount = selection.grandTotal - oldGrandTotal;

        oldB.totalAmount = selection.totalAmount;
        oldB.taxAmount = selection.taxAmount;
        oldB.grandTotal = selection.grandTotal;
        oldB.amount = selection.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
        oldB.paymentMethod = selectedMethod;
        oldB.updatedAt = new Date().toISOString();
        
        if (!oldB.modificationHistory) oldB.modificationHistory = [];
        oldB.modificationHistory.push({
          bookingId: targetId,
          action: actionMsg,
          prev: prevVal,
          new: newVal,
          timestamp: new Date().toISOString(),
          diff: diffAmount
        });

        bList[bIdx] = oldB;
        HotelState.bookings = bList;

        
        
        const mockNotifs = HotelState.notifications;
        mockNotifs.unshift({
          id: 'NOTIF' + Date.now(),
          recipientId: userId,
          recipientRole: 'Customer',
          type: 'Modification',
          title: 'Booking Modified',
          message: `Your booking ${targetId} has been successfully modified.`,
          isRead: false,
          createdAt: new Date().toISOString(),
          relatedId: targetId
        });
        HotelState.notifications = mockNotifs;
      }
      
      sessionStorage.setItem('hbs_last_booking_id', targetId);
      sessionStorage.removeItem('isModification');
      window.location.href = 'booking_success.html';
      return;
    }

    // Generate Booking
    const bookingId = selection.bookingId || `EE-${hotel.id.replace('HTL','')}-${new Date().getFullYear().toString().substr(-2)}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Save new card if applicable
    if (selectedMethod === 'Card' && selectSavedCard && selectSavedCard.value === 'new') {
       const newCards = HotelState.savedCards;
       newCards.push({
         id: 'card_' + Date.now(),
         type: cardNumber.value.startsWith('4') ? 'Visa' : 'Mastercard',
         last4: cardNumber.value.replace(/\s/g,'').slice(-4),
         exp: cardExpiry.value,
         name: cardName.value
       });
       HotelState.savedCards = newCards;
    }

    const checkInDateObj = new Date(selection.checkIn);
    const checkOutDateObj = new Date(selection.checkOut);

    const booking = {
      id: bookingId,
      txnId: 'TXN' + Date.now(),
      branch: hotel.location ? hotel.location.split(',')[0].trim() : 'Coimbatore',
      hotelName: hotel.name,
      image: hotel.imageUrl || hotel.image || '',
      checkIn: new Date(selection.checkIn).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      checkInDay: checkInDateObj.toLocaleDateString('en-US', { weekday: 'long' }),
      checkOut: new Date(selection.checkOut).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      checkOutDay: checkOutDateObj.toLocaleDateString('en-US', { weekday: 'long' }),
      amount: selection.grandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 }),
      status: 'Upcoming',
      email: guestDetails.primaryGuest.email,
      hotelId: selection.hotelId,
      roomId: selection.roomId,
      customerId: userId,
      nights: selection.nights,
      adultsCount: selection.adults || 1,
      childrenCount: selection.children || 0,
      guestDetails: guestDetails,
      totalAmount: selection.totalAmount,
      taxAmount: selection.taxAmount,
      grandTotal: selection.grandTotal,
      paymentStatus: 'Paid',
      paymentMethod: selectedMethod,
      bookingStatus: 'Confirmed',
      specialRequests: guestDetails.specialRequests,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Add to bookings
    const bookings = HotelState.bookings;
    bookings.push(booking);
    HotelState.bookings = bookings;

    // 2. Update room status
    HotelState.updateRoomStatus(selection.roomId, 'Occupied');

    // 3. Add notification
    const mockNotifs = HotelState.notifications;
    mockNotifs.unshift({
      id: 'NOTIF' + Date.now(),
      recipientId: userId,
      recipientRole: 'Customer',
      type: 'Booking',
      title: 'Booking Confirmed',
      message: `Your booking ${bookingId} at ${hotel.name} has been confirmed.`,
      isRead: false,
      createdAt: new Date().toISOString(),
      relatedId: bookingId
    });
    HotelState.notifications = mockNotifs;

    
    const userObj = HotelState.getUserById(userId);
    const userName = userObj ? `${userObj.firstName} ${userObj.lastName}` : 'Customer';
    

    // 5. Navigate
    sessionStorage.setItem('hbs_last_booking_id', bookingId);
    window.location.href = 'booking_success.html';
  }

});
