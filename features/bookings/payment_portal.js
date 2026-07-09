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

  // ── Razorpay checkout ─────────────────────────────────────────────────────
  const btnPayRazorpay = document.getElementById('btnPayRazorpay');
  const btnPayText     = document.getElementById('btnPayRazorpayText');

  if (btnPayRazorpay) {
    btnPayRazorpay.addEventListener('click', () => {
      // Disable button while Razorpay is open
      btnPayRazorpay.disabled = true;
      if (btnPayText) btnPayText.textContent = 'Opening Razorpay…';

      const rzpOptions = {
        key: 'rzp_test_T8UtZpyMedZBY8',          // Razorpay test key
        amount: Math.round(amountToPay * 100),    // amount in paise
        currency: 'INR',
        name: 'Elegant Enclave',
        description: isModification
          ? `Booking Modification – ${sessionStorage.getItem('modify_bookingId') || localStorage.getItem('selectedBookingId') || ''}`
          : `Room Booking – ${hotel.name} · ${room.type}`,
        image: '../../assets/images/logo.png',
        handler: function (response) {
          // Payment successful — show processing overlay then finalize
          selectedMethod = 'Razorpay';
          const overlay = document.getElementById('paymentProgressOverlay');
          if (overlay) overlay.classList.remove('d-none');
          setTimeout(() => completeBooking(), 1800);
        },
        prefill: {
          name:    displayName,
          email:   displayEmail,
          contact: currentUser.phone || currentUser.mobile || ''
        },
        notes: {
          booking_type: isModification ? 'modification' : 'new',
          hotel:        hotel.name,
          room:         room.type
        },
        theme: { color: '#1A0A2E' },
        modal: {
          ondismiss: function () {
            // User closed Razorpay without paying — re-enable button
            btnPayRazorpay.disabled = false;
            if (btnPayText) btnPayText.textContent = 'Pay Securely with Razorpay';
          }
        }
      };

      const rzp = new Razorpay(rzpOptions);
      rzp.on('payment.failed', function (response) {
        btnPayRazorpay.disabled = false;
        if (btnPayText) btnPayText.textContent = 'Pay Securely with Razorpay';
        const failModal = new bootstrap.Modal(document.getElementById('paymentFailedModal'));
        const failReason = document.getElementById('lblFailReason');
        if (failReason) failReason.textContent = response.error?.description || 'Payment was declined. Please try again.';
        failModal.show();
      });

      rzp.open();
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

        HotelState.addAuditLog(userId, userName, 'Customer', 'BOOKING_MODIFIED', 'Bookings', `${actionMsg} for booking ${targetId}. Amount Difference: ₹${diffAmount.toLocaleString('en-IN')}`);
        
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

    // 4. Add audit log
    const userObj = HotelState.getUserById(userId);
    const userName = userObj ? `${userObj.firstName} ${userObj.lastName}` : 'Customer';
    HotelState.addAuditLog(userId, userName, 'Customer', 'BOOKING_CREATED', 'Bookings', `Created booking ${bookingId} via ${selectedMethod}`);

    // 5. Navigate
    sessionStorage.setItem('hbs_last_booking_id', bookingId);
    window.location.href = 'booking_success.html';
  }

});
