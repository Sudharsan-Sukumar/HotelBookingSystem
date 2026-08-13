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

  // Load new calculated values from local storage
  const calc = modContext.draftChanges.calculated || {};
  const newCheckIn = calc.newCheckIn || booking.checkIn;
  const newCheckOut = calc.newCheckOut || booking.checkOut;
  const newNights = parseInt(calc.newNights || booking.nights || 1, 10);
  const newGrandTotal = parseFloat(calc.newGrandTotal || 0);
  const priceDiff = parseFloat(calc.priceDiff || 0);
  const newRoomType = calc.newRoomType || booking.roomType;
  const newRoomId = calc.newRoomId || booking.roomId;
  const newGuests = parseInt(calc.newGuests || booking.guests || booking.adultsCount || 2, 10);

  // Fetch UI elements
  const currentTotalEl = document.getElementById('lblCurrentTotal');
  const newTotalEl = document.getElementById('lblNewTotal');
  const diffCard = document.getElementById('diffCardContainer');
  const diffTitle = diffCard ? diffCard.querySelector('strong') : null;
  const diffAmountEl = document.getElementById('lblDiffAmount');
  const diffDesc = document.getElementById('lblDiffDesc');
  const labelMathSymbol = document.querySelector('#lblMathSymbolContainer i');
  const successAlertBanner = document.querySelector('.success-alert-banner');
  const successAlertText = successAlertBanner ? successAlertBanner.querySelector('.small') : null;
  const btnProceedPayment = document.getElementById('btnProceedPayment');

  // Fill old details card
  const oldGrandTotal = booking.grandTotal || Number(booking.amount?.replace(/,/g, '') || 0);
  if (currentTotalEl) currentTotalEl.textContent = oldGrandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  
  // Fill new details card
  if (newTotalEl) newTotalEl.textContent = newGrandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });

  // Update dynamic review text fields
  const oldCard = document.querySelector('.col-md-5:first-child .comparison-details-card');
  if (oldCard) {
    oldCard.innerHTML = `
      <div class="py-2 border-bottom"><strong>Room Type:</strong> <span>${booking.roomType}</span></div>
      <div class="py-2 border-bottom"><strong>Check-In:</strong> <span>${booking.checkIn}</span></div>
      <div class="py-2 border-bottom"><strong>Check-Out:</strong> <span>${booking.checkOut}</span></div>
      <div class="py-2"><strong>Duration:</strong> <span>${booking.nights || 1} Nights</span></div>
    `;
  }

  const newCard = document.querySelector('.col-md-5:last-child .comparison-details-card');
  if (newCard) {
    newCard.innerHTML = `
      <div class="py-2 border-bottom"><strong>Room Type:</strong> <span class="text-success fw-bold">${newRoomType}</span></div>
      <div class="py-2 border-bottom"><strong>Check-In:</strong> <span class="text-success fw-bold">${newCheckIn}</span></div>
      <div class="py-2 border-bottom"><strong>Check-Out:</strong> <span class="text-success fw-bold">${newCheckOut}</span></div>
      <div class="py-2"><strong>Duration:</strong> <span class="text-success fw-bold">${newNights} Nights</span></div>
    `;
  }

  // Clean up function on confirm
  function finalizeModification() {
    localStorage.removeItem('bookingModificationContext');
  }

  // Handle options pathways
  if (priceDiff > 0) {
    // 1. Higher Price Room / Additional Payment path
    if (diffAmountEl) diffAmountEl.textContent = priceDiff.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    if (diffTitle) diffTitle.textContent = "Additional Amount Required";
    if (diffDesc) diffDesc.textContent = "To confirm this modification, you must pay the difference.";
    if (labelMathSymbol) labelMathSymbol.className = "bi bi-plus-lg text-danger";
    if (successAlertBanner) successAlertBanner.classList.add('d-none');


    if (btnProceedPayment) {
      btnProceedPayment.innerHTML = 'Proceed to Payment <i class="bi bi-arrow-right"></i>';
      btnProceedPayment.addEventListener('click', (e) => {
        e.preventDefault();
        // Directly reveal payment method selection — no intermediate modal
        const paySection = document.getElementById('paymentMethodSection');
        if (paySection) {
          paySection.classList.remove('d-none');
          paySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        // Hide proceed button to prevent duplicate clicks
        btnProceedPayment.style.display = 'none';
      });
    }
  } else if (priceDiff < 0) {
    // 2. Lower Price Room / Refund path
    if (diffAmountEl) diffAmountEl.textContent = Math.abs(priceDiff).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    if (diffTitle) diffTitle.textContent = "Refund Amount Due";
    if (diffDesc) diffDesc.textContent = "The price difference will be refunded to your original payment method. Refunds are processed within 3-5 business days.";
    if (labelMathSymbol) labelMathSymbol.className = "bi bi-distribute-vertical text-success";
    if (successAlertBanner) successAlertBanner.classList.add('d-none');


    if (btnProceedPayment) {
      btnProceedPayment.innerHTML = 'Confirm Stay Modification & Refund <i class="bi bi-arrow-right"></i>';
      btnProceedPayment.addEventListener('click', (e) => {
        e.preventDefault();
        // Update booking list in Local Storage directly
        const bList = HotelState.bookings;
        const bIdx = bList.findIndex(b => b.id === bookingId);
        if (bIdx !== -1) {
          const oldB = bList[bIdx];
          
          if (oldB.roomId !== newRoomId) {
            HotelState.updateRoomStatus(oldB.roomId, 'Available');
            HotelState.updateRoomStatus(newRoomId, 'Occupied');
          }

          let actionMsg = 'Modification';
          let prevVal = `Dates: ${oldB.checkIn} to ${oldB.checkOut}, Room: ${oldB.roomType}`;
          let newVal = `Dates: ${newCheckIn} to ${newCheckOut}, Room: ${newRoomType}`;

          oldB.checkIn = newCheckIn;
          oldB.checkOut = newCheckOut;
          oldB.nights = newNights;
          oldB.roomId = newRoomId;
          oldB.roomType = newRoomType;
          oldB.guests = newGuests;
          oldB.adultsCount = newGuests;
          
          oldB.totalAmount = newGrandTotal / 1.18;
          oldB.taxAmount = newGrandTotal - (newGrandTotal / 1.18);
          oldB.grandTotal = newGrandTotal;
          oldB.amount = newGrandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
          
          oldB.refundStatus = 'Pending';
          oldB.refundAmount = Math.abs(priceDiff);
          oldB.refundMethod = oldB.paymentMethod || 'Debit / Credit Card';
          oldB.updatedAt = new Date().toISOString();

          if (!oldB.modificationHistory) oldB.modificationHistory = [];
          oldB.modificationHistory.push({
            bookingId: bookingId,
            action: actionMsg,
            prev: prevVal,
            new: newVal,
            timestamp: new Date().toISOString(),
            diff: priceDiff
          });

          bList[bIdx] = oldB;
          HotelState.bookings = bList;

          
          const userObj = HotelState.getUserById(userId);
          const userName = userObj ? `${userObj.firstName} ${userObj.lastName}` : 'Customer';
          
          
          // Notification
          const mockNotifs = HotelState.notifications;
          mockNotifs.unshift({
            id: 'NOTIF' + Date.now(),
            recipientId: userId,
            recipientRole: 'Customer',
            type: 'Modification',
            title: 'Booking Modified & Refund Initiated',
            message: `Your booking ${bookingId} was modified. Refund of ₹${Math.abs(priceDiff).toLocaleString('en-IN')} pending.`,
            isRead: false,
            createdAt: new Date().toISOString(),
            relatedId: bookingId
          });
          HotelState.notifications = mockNotifs;
        }

        sessionStorage.setItem('hbs_last_booking_id', bookingId);
        sessionStorage.setItem('modify_refund_applied', 'true');
        sessionStorage.setItem('modify_refund_val', Math.abs(priceDiff).toLocaleString('en-IN'));
        finalizeModification();
        window.location.href = 'booking_success.html';
      });
    }
  } else {
    // 3. Same Price Room path
    if (diffAmountEl) diffAmountEl.textContent = '₹0';
    if (diffTitle) diffTitle.textContent = "Stay Modified Successfully";
    if (diffDesc) diffDesc.textContent = "No extra charges or refunds required.";
    if (labelMathSymbol) labelMathSymbol.className = "bi bi-check-all text-success";
    if (successAlertText) successAlertText.textContent = "Your stay details are updated. No extra payment required.";
    if (successAlertBanner) successAlertBanner.className = "success-alert-banner p-3 d-flex align-items-center gap-3 text-start bg-success-light border-success";

    if (btnProceedPayment) {
      btnProceedPayment.innerHTML = 'Confirm Stay Modification <i class="bi bi-arrow-right"></i>';
      btnProceedPayment.addEventListener('click', (e) => {
        e.preventDefault();
        const bList = HotelState.bookings;
        const bIdx = bList.findIndex(b => b.id === bookingId);
        if (bIdx !== -1) {
          const oldB = bList[bIdx];
          
          if (oldB.roomId !== newRoomId) {
            HotelState.updateRoomStatus(oldB.roomId, 'Available');
            HotelState.updateRoomStatus(newRoomId, 'Occupied');
          }

          let actionMsg = 'Modification';
          let prevVal = `Dates: ${oldB.checkIn} to ${oldB.checkOut}, Room: ${oldB.roomType}`;
          let newVal = `Dates: ${newCheckIn} to ${newCheckOut}, Room: ${newRoomType}`;

          oldB.checkIn = newCheckIn;
          oldB.checkOut = newCheckOut;
          oldB.nights = newNights;
          oldB.roomId = newRoomId;
          oldB.roomType = newRoomType;
          oldB.guests = newGuests;
          oldB.adultsCount = newGuests;
          oldB.updatedAt = new Date().toISOString();

          if (!oldB.modificationHistory) oldB.modificationHistory = [];
          oldB.modificationHistory.push({
            bookingId: bookingId,
            action: actionMsg,
            prev: prevVal,
            new: newVal,
            timestamp: new Date().toISOString(),
            diff: 0
          });

          bList[bIdx] = oldB;
          HotelState.bookings = bList;

          
          const userObj = HotelState.getUserById(userId);
          const userName = userObj ? `${userObj.firstName} ${userObj.lastName}` : 'Customer';
          
          
          // Notification
          const mockNotifs = HotelState.notifications;
          mockNotifs.unshift({
            id: 'NOTIF' + Date.now(),
            recipientId: userId,
            recipientRole: 'Customer',
            type: 'Modification',
            title: 'Booking Modified',
            message: `Your booking ${bookingId} stay details have been updated successfully.`,
            isRead: false,
            createdAt: new Date().toISOString(),
            relatedId: bookingId
          });
          HotelState.notifications = mockNotifs;
        }

        sessionStorage.setItem('hbs_last_booking_id', bookingId);
        sessionStorage.setItem('modify_refund_applied', 'false');
        finalizeModification();
        window.location.href = 'booking_success.html';
      });
    }
  }

  // ── Global: highlight selected payment method card ─────────────────────────
  window.selectModPayMethod = function(method) {
    document.querySelectorAll('.payment-method-option').forEach(card => {
      card.style.border = '1px solid #dee2e6';
      card.style.backgroundColor = '#fff';
    });
    const radioMap = { 'UPI': 'radioUPI', 'Net Banking': 'radioNetBanking', 'Card': 'radioCard' };
    const radio = document.getElementById(radioMap[method]);
    if (radio) {
      radio.checked = true;
      const card = radio.closest('.payment-method-option');
      if (card) {
        card.style.border = '2px solid #D4AF37';
        card.style.backgroundColor = '#FAF8F4';
      }
    }
    const err = document.getElementById('payMethodError');
    if (err) err.classList.add('d-none');
  };

  // ── "Pay Now with Razorpay" button ─────────────────────────────────────────
  const btnLaunchRazorpay = document.getElementById('btnLaunchRazorpay');
  if (btnLaunchRazorpay) {
    btnLaunchRazorpay.addEventListener('click', () => {
      // Validate: method must be selected
      const selectedRadio = document.querySelector('input[name="modPayMethod"]:checked');
      if (!selectedRadio) {
        const err = document.getElementById('payMethodError');
        if (err) err.classList.remove('d-none');
        return;
      }
      const selectedMethod = selectedRadio.value;

      const originalHTML = btnLaunchRazorpay.innerHTML;
      btnLaunchRazorpay.disabled = true;
      btnLaunchRazorpay.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Opening Razorpay…';

      const currentUser = (window.HotelState && HotelState.currentUser) ? HotelState.currentUser : {};
      const displayName  = currentUser.name || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'Guest';
      const displayEmail = currentUser.email || '';

      const amountToPay = Math.round(priceDiff); // only the price difference

      const rzpOptions = {
        key: 'rzp_test_T8UtZpyMedZBY8',
        amount: Math.round(amountToPay * 100), // paise
        currency: 'INR',
        name: 'Elegant Enclave',
        description: `Booking Modification – ${bookingId}`,
        image: '../../assets/images/logo.png',
        handler: function(response) {
          btnLaunchRazorpay.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing…';
          completeModificationWithPayment(selectedMethod, response.razorpay_payment_id);
        },
        prefill: {
          name:    displayName,
          email:   displayEmail,
          contact: currentUser.phone || currentUser.mobile || ''
        },
        notes: { booking_id: bookingId },
        theme: { color: '#1A0A2E' },
        modal: {
          ondismiss: function() {
            btnLaunchRazorpay.disabled = false;
            btnLaunchRazorpay.innerHTML = originalHTML;
          }
        }
      };

      const rzp = new Razorpay(rzpOptions);
      rzp.on('payment.failed', function(response) {
        btnLaunchRazorpay.disabled = false;
        btnLaunchRazorpay.innerHTML = originalHTML;
        const failModal = new bootstrap.Modal(document.getElementById('paymentFailedModal'));
        const reason = document.getElementById('lblModPayFailReason');
        if (reason) reason.textContent = response.error?.description || 'Payment was declined. Please try again.';
        failModal.show();
      });

      rzp.open();
    });
  }

  // Retry on failure modal
  const btnRetryModPay = document.getElementById('btnRetryModPay');
  if (btnRetryModPay) {
    btnRetryModPay.addEventListener('click', () => {
      const modal = bootstrap.Modal.getInstance(document.getElementById('paymentFailedModal'));
      if (modal) modal.hide();
      setTimeout(() => btnLaunchRazorpay?.click(), 400);
    });
  }

  // ── Complete modification after successful Razorpay payment ─────────────────
  function completeModificationWithPayment(selectedMethod, razorpayPaymentId) {
    const bList = HotelState.bookings;
    const bIdx  = bList.findIndex(b => b.id === bookingId);
    if (bIdx !== -1) {
      const oldB   = bList[bIdx];
      const prevVal = `Dates: ${oldB.checkIn} to ${oldB.checkOut}, Room: ${oldB.roomType}`;
      const newValStr = `Dates: ${newCheckIn} to ${newCheckOut}, Room: ${newRoomType}`;

      // Update room availability
      if (oldB.roomId !== newRoomId) {
        HotelState.updateRoomStatus(oldB.roomId, 'Available');
        HotelState.updateRoomStatus(newRoomId, 'Occupied');
      }

      // Apply changes
      oldB.checkIn      = newCheckIn;
      oldB.checkOut     = newCheckOut;
      oldB.nights       = newNights;
      oldB.roomId       = newRoomId;
      oldB.roomType     = newRoomType;
      oldB.guests       = newGuests;
      oldB.adultsCount  = newGuests;
      oldB.totalAmount  = newGrandTotal / 1.18;
      oldB.taxAmount    = newGrandTotal - (newGrandTotal / 1.18);
      oldB.grandTotal   = newGrandTotal;
      oldB.amount       = newGrandTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 });
      oldB.paymentMethod = selectedMethod;
      oldB.txnId        = razorpayPaymentId || ('TXN' + Date.now());
      oldB.updatedAt    = new Date().toISOString();

      if (!oldB.modificationHistory) oldB.modificationHistory = [];
      oldB.modificationHistory.push({
        bookingId: bookingId,
        action:    'Upgrade — Additional Payment',
        prev:      prevVal,
        new:       newValStr,
        timestamp: new Date().toISOString(),
        diff:      priceDiff
      });

      bList[bIdx] = oldB;
      HotelState.bookings = bList;

      
      const userObj  = HotelState.getUserById(userId);
      const userName = userObj ? `${userObj.firstName} ${userObj.lastName}` : 'Customer';
      

      // Notification
      const notifs = HotelState.notifications;
      notifs.unshift({
        id:            'NOTIF' + Date.now(),
        recipientId:   userId,
        recipientRole: 'Customer',
        type:          'Modification',
        title:         'Booking Modified & Payment Received',
        message:       `Booking ${bookingId} upgraded. Payment of ₹${Math.round(priceDiff).toLocaleString('en-IN')} received via ${selectedMethod}.`,
        isRead:        false,
        createdAt:     new Date().toISOString(),
        relatedId:     bookingId
      });
      HotelState.notifications = notifs;
    }

    sessionStorage.setItem('hbs_last_booking_id', bookingId);
    finalizeModification();
    window.location.href = 'booking_success.html';
  }

  // ── Help & Contact Support Modal setup ─────────────────────────────────────
  const btnContactSupport = document.getElementById('btnContactSupport');
  if (btnContactSupport) {
    btnContactSupport.addEventListener('click', () => {
      const contactModal = new bootstrap.Modal(document.getElementById('receptionContactModal'));
      contactModal.show();
    });
  }

  // Ringing Call and Email simulation variables
  const phoneBtn = document.getElementById('receptionPhoneBtn');
  const emailBtn = document.getElementById('receptionEmailBtn');
  const callModalEl = document.getElementById('receptionCallModal');
  const callProgressState = document.getElementById('callProgressState');
  const callResultState = document.getElementById('callResultState');
  const callDurationTimer = document.getElementById('callDurationTimer');
  const btnCancelCall = document.getElementById('btnCancelCall');
  const btnCallSendEmail = document.getElementById('btnCallSendEmail');

  let audioCtx = null;
  let ringTimeout1 = null;
  let ringTimeout2 = null;
  let finalSpeechTimeout = null;
  let durationInterval = null;
  let durationSec = 0;
  let isCallActive = false;

  const emailTo = 'support@elegantenclave.com';
  const emailSubject = 'Assistance with Booking Modification';
  const emailBody = 'Hello Support Team,\n\nI need assistance regarding my booking modification...\n\nThank you.';

  function openEmailClient() {
    const mailtoUrl = `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoUrl, '_self');
  }

  if (emailBtn) {
    emailBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openEmailClient();
    });
  }

  if (btnCallSendEmail) {
    btnCallSendEmail.addEventListener('click', () => {
      const callModal = bootstrap.Modal.getInstance(callModalEl);
      if (callModal) callModal.hide();
      openEmailClient();
    });
  }

  function playRingingTone() {
    if (!isCallActive) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.frequency.value = 440;
      osc2.frequency.value = 480;

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime + 1.8);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.0);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start();
      osc2.start();

      setTimeout(() => {
        osc1.stop();
        osc2.stop();
        if (audioCtx) {
          audioCtx.close();
          audioCtx = null;
        }
      }, 2000);
    } catch (e) {
      console.log('AudioContext error:', e);
    }
  }

  if (phoneBtn) {
    phoneBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const callModal = new bootstrap.Modal(callModalEl);
      callModal.show();

      isCallActive = true;
      callProgressState.classList.remove('d-none');
      callResultState.classList.add('d-none');
      durationSec = 0;
      callDurationTimer.textContent = '00:00';

      playRingingTone();
      ringTimeout1 = setTimeout(() => {
        playRingingTone();
      }, 3000);

      ringTimeout2 = setTimeout(() => {
        playRingingTone();
      }, 6000);

      finalSpeechTimeout = setTimeout(() => {
        callProgressState.classList.add('d-none');
        callResultState.classList.remove('d-none');

        durationInterval = setInterval(() => {
          durationSec++;
          const mins = String(Math.floor(durationSec / 60)).padStart(2, '0');
          const secs = String(durationSec % 60).padStart(2, '0');
          callDurationTimer.textContent = `${mins}:${secs}`;
        }, 1000);
      }, 9000);
    });
  }

  function handleEndCall() {
    isCallActive = false;
    clearTimeout(ringTimeout1);
    clearTimeout(ringTimeout2);
    clearTimeout(finalSpeechTimeout);
    clearInterval(durationInterval);
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
    const callModal = bootstrap.Modal.getInstance(callModalEl);
    if (callModal) callModal.hide();
  }

  if (btnCancelCall) {
    btnCancelCall.addEventListener('click', handleEndCall);
  }
  if (callModalEl) {
    callModalEl.addEventListener('hidden.bs.modal', handleEndCall);
  }
});
