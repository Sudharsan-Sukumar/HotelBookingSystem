document.addEventListener('DOMContentLoaded', () => {
  let bookingId = sessionStorage.getItem('invoiceBookingId') || sessionStorage.getItem('currentBookingId');
  let booking = null;

  if (window.HotelState && bookingId) {
    booking = HotelState.bookings.find(b => b.id === bookingId);
  }

  const rawSearch = localStorage.getItem('hbs_booking_selection') || sessionStorage.getItem('hbs_booking_selection');
  let selectionObj = null;
  if (rawSearch) {
    selectionObj = JSON.parse(rawSearch);
  }

  if (booking) {
    bookingId = booking.id;
  } else if (selectionObj && selectionObj.bookingId) {
    bookingId = selectionObj.bookingId;
  } else if (!bookingId) {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    bookingId = `EE-COB-260625-${randomDigits}`;
    sessionStorage.setItem('currentBookingId', bookingId);
  }

  const bookingIdText = document.getElementById('bookingIdText');
  if (bookingIdText) {
    bookingIdText.textContent = bookingId;
  }

  // Populate dynamically
  let checkin = '2026-06-25';
  let checkout = '2026-06-28';
  let pricePerNight = 6500;
  let roomType = 'Executive Studio Room';
  let rooms = 1;
  let nights = 3;
  let baseAmount = 19500;
  let gst = 3510;
  let total = 23010;
  let branchName = 'Coimbatore';
  let hotel = null;
  let roomObj = null;
  let selection = null;

  let guestDetails = null;
  const rawGuest = localStorage.getItem('hbs_booking_guest') || sessionStorage.getItem('hbs_booking_guest');
  if (rawGuest) guestDetails = JSON.parse(rawGuest);

  if (booking) {
    checkin = booking.checkIn;
    checkout = booking.checkOut;
    nights = booking.nights || 1;
    rooms = booking.guestDetails?.roomsCount || 1;
    baseAmount = booking.totalAmount || (booking.grandTotal / 1.18);
    gst = booking.taxAmount || (booking.grandTotal - baseAmount);
    total = booking.grandTotal;
    pricePerNight = (booking.pricePerNight) || Math.round(baseAmount / (nights * rooms));
    branchName = booking.branch || 'Coimbatore';

    if (window.HotelState) {
      hotel = HotelState.getHotelById(booking.hotelId);
      roomObj = HotelState.getRoomById(booking.roomId);
      if (roomObj) roomType = `${roomObj.type} Room`;
      else roomType = `Room ${booking.roomId}`;
    }
  } else {
    checkin = sessionStorage.getItem('search_checkin') || '2026-06-25';
    checkout = sessionStorage.getItem('search_checkout') || '2026-06-28';
    pricePerNight = parseInt(sessionStorage.getItem('selected_room_price') || '6500', 10);
    roomType = sessionStorage.getItem('selected_room_type') || 'Executive Studio Room';
    rooms = parseInt(sessionStorage.getItem('search_rooms') || '1', 10);

    const ms = new Date(checkout) - new Date(checkin);
    nights = Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    baseAmount = pricePerNight * nights * rooms;
    gst = Math.round(baseAmount * 0.18);
    total = baseAmount + gst;
    
    const rawSearch = localStorage.getItem('hbs_booking_selection') || sessionStorage.getItem('hbs_booking_selection');
    if (rawSearch) {
      selection = JSON.parse(rawSearch);
      checkin = selection.checkIn || checkin;
      checkout = selection.checkOut || checkout;
      nights = selection.nights || nights;
      pricePerNight = selection.pricePerNight || pricePerNight;
      baseAmount = selection.totalAmount || baseAmount;
      gst = selection.taxAmount || gst;
      total = selection.grandTotal || total;
      
      if (window.HotelState) {
        hotel = HotelState.getHotelById(selection.hotelId);
        if (hotel) branchName = hotel.location ? hotel.location.split(',')[0].trim() : 'Coimbatore';
        roomObj = HotelState.getRoomById(selection.roomId);
        if (roomObj) roomType = `${roomObj.type} Room`;
      }
    }
  }

  // Update Hotel display info
  if (hotel) {
    const nameEl = document.querySelector('.hotel-display-name');
    if (nameEl) nameEl.textContent = hotel.name;
    const imgEl = document.querySelector('.invoice-hotel-img');
    if (imgEl) imgEl.src = hotel.imageUrl || hotel.image || '';
  }

  const branchSubtitle = document.querySelector('.hotel-display-branch');
  if (branchSubtitle) branchSubtitle.textContent = `${branchName} Branch - ${roomType}`;

  // Update Grid Blocks
  const detailSpans = document.querySelectorAll('.detail-info-block .fw-bold.text-dark');
  const subSpans = document.querySelectorAll('.detail-info-block .small.text-muted');
  
  if (detailSpans.length >= 4) {
    detailSpans[0].textContent = new Date(checkin).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    detailSpans[1].textContent = new Date(checkout).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    detailSpans[2].textContent = `${nights} Night${nights > 1 ? 's' : ''}`;
    
    const adultVal = booking?.adultsCount || (selection ? selection.adults : 1);
    const childVal = booking?.childrenCount || (selection ? selection.children : 0);
    const guestTotal = parseInt(adultVal) + parseInt(childVal);
    detailSpans[3].textContent = `${guestTotal} Guest${guestTotal > 1 ? 's' : ''}`;
  }
  
  if (subSpans.length >= 4) {
    subSpans[0].textContent = new Date(checkin).toLocaleDateString('en-US', { weekday: 'long' });
    subSpans[1].textContent = new Date(checkout).toLocaleDateString('en-US', { weekday: 'long' });
    subSpans[3].textContent = `${rooms} Room${rooms > 1 ? 's' : ''}`;
  }

  // Render Section 2.5: Guest & Room Details
  const guestRoomBlock = document.getElementById('guestRoomInvoiceDetails');
  if (guestRoomBlock) {
    guestRoomBlock.classList.remove('d-none');
    
    const primaryGuest = booking?.guestDetails?.primaryGuest || guestDetails?.primaryGuest || {};
    const specialReqVal = booking?.specialRequests || guestDetails?.specialRequests || 'None';
    const roomCapacity = roomObj ? ((roomObj.capacity?.adults || 2) + (roomObj.capacity?.children || 0)) : 4;
    const roomCapacityText = roomObj && roomObj.capacity ? `${roomObj.capacity.adults} Adults, ${roomObj.capacity.children} Children` : `${roomCapacity} Guests`;
    
    guestRoomBlock.innerHTML = `
      <div class="row g-4">
        <div class="col-md-6 border-end">
          <h4 class="section-badge-title mb-3" style="font-size:1.1rem; color:#1A0A2E;"><i class="bi bi-person-bounding-box me-2 text-warning"></i>Guest Information</h4>
          <p class="mb-2"><strong>Primary Guest:</strong> ${primaryGuest.name || 'N/A'}</p>
          <p class="mb-2"><strong>Contact Number:</strong> ${primaryGuest.phone || 'N/A'}</p>
          <p class="mb-2"><strong>Email Address:</strong> ${primaryGuest.email || 'N/A'}</p>
          <p class="mb-2"><strong>ID Verification:</strong> ${primaryGuest.idType || 'N/A'} - ${primaryGuest.idNumber || 'N/A'}</p>
          <p class="mb-0"><strong>Special Requests:</strong> ${specialReqVal}</p>
        </div>
        <div class="col-md-6">
          <h4 class="section-badge-title mb-3" style="font-size:1.1rem; color:#1A0A2E;"><i class="bi bi-door-open me-2 text-warning"></i>Room Information</h4>
          <p class="mb-2"><strong>Room Type:</strong> ${roomType}</p>
          <p class="mb-2"><strong>Room Capacity:</strong> ${roomCapacityText}</p>
          <p class="mb-2"><strong>Rate per Night:</strong> Rs. ${pricePerNight.toLocaleString()}</p>
          <p class="mb-2"><strong>Room Status:</strong> Confirmed</p>
          <p class="mb-0"><strong>Hotel Address:</strong> ${hotel?.location || 'Salem / Coimbatore / Chennai Branch'}</p>
        </div>
      </div>
    `;
  }

  // Ensure all values are valid numbers
  nights = parseInt(nights) || 1;
  pricePerNight = parseInt(pricePerNight) || 6500;
  baseAmount = parseInt(baseAmount) || (pricePerNight * nights * rooms);
  gst = parseInt(gst) || Math.round(baseAmount * 0.18);
  total = parseInt(total) || (baseAmount + gst);

  const baseChargeLabel = document.getElementById('baseRoomChargeLabel');
  const baseRoomChargeValue = document.getElementById('baseRoomChargeValue');
  const gstValue = document.getElementById('gstValue');
  
  if (baseChargeLabel) baseChargeLabel.innerHTML = `Base room charge (${nights} &times; Rs. ${pricePerNight.toLocaleString()})`;
  if (baseRoomChargeValue) baseRoomChargeValue.textContent = `Rs. ${baseAmount.toLocaleString()}.00`;
  if (gstValue) gstValue.textContent = `Rs. ${gst.toLocaleString()}.00`;
  
  const totalBill = document.querySelector('.total-bill-value');
  if (totalBill) {
    totalBill.textContent = `Rs. ${total.toLocaleString()}.00`;
  }

  let selectedPaymentMethod = '';

  window.selectPaymentMethod = function(method) {
    selectedPaymentMethod = method;
    localStorage.setItem('hbs_selected_payment_method', method);
    
    // Highlight UI
    document.querySelectorAll('.payment-method-card').forEach(card => {
      card.style.border = '1px solid #dee2e6';
      card.style.backgroundColor = '#fff';
    });
    
    const radioId = method === 'UPI' ? 'payUpi' : (method === 'Card' ? 'payCard' : 'payNetBanking');
    const radio = document.getElementById(radioId);
    if (radio) {
      radio.checked = true;
      const card = radio.closest('.payment-method-card');
      if (card) {
        card.style.border = '2px solid #D4AF37';
        card.style.backgroundColor = '#FAF8F4';
      }
    }
    
    const err = document.getElementById('paymentMethodError');
    if (err) err.classList.add('d-none');
  };

  const btnProceed1 = document.getElementById('btnProceedInvoice1');
  if (btnProceed1) {
    btnProceed1.addEventListener('click', () => {
      if (!selectedPaymentMethod) {
        const err = document.getElementById('paymentMethodError');
        if (err) err.classList.remove('d-none');
        return;
      }
      
      const launchPaymentGateway = () => {
        const primaryGuest = booking?.guestDetails?.primaryGuest || guestDetails?.primaryGuest || {};
        const userId = localStorage.getItem('userId') || 'USR001';
        
        const originalText = btnProceed1.innerHTML;
        btnProceed1.setAttribute('disabled', 'true');
        btnProceed1.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Launching Payment Gateway...';

        const options = {
          key: "rzp_test_T8UtZpyMedZBY8",
          amount: Math.round(total * 100), // amount in paisa
          currency: "INR",
          name: hotel ? hotel.name : "Elegant Enclave",
          description: `${roomType} Booking - Ref: ${bookingId}`,
          image: "../../assets/images/logo.png",
          handler: function(response) {
            btnProceed1.removeAttribute('disabled');
            btnProceed1.innerHTML = originalText;
            completeBookingWithRazorpay(response.razorpay_payment_id);
          },
          prefill: {
            name: primaryGuest.name || "",
            email: primaryGuest.email || "",
            contact: primaryGuest.phone || ""
          },
          notes: {
            bookingId: bookingId,
            roomId: selection?.roomId || '',
            hotelId: selection?.hotelId || '',
            checkIn: checkin,
            checkOut: checkout,
            nights: nights,
            paymentMethod: selectedPaymentMethod
          },
          theme: {
            color: "#1A0A2E"
          },
          modal: {
            ondismiss: function() {
              btnProceed1.removeAttribute('disabled');
              btnProceed1.innerHTML = originalText;
              saveFailedBooking();
            }
          }
        };
        
        const rzp = new Razorpay(options);
        rzp.open();
      };

      if (window.policyModal) {
        window.policyModal.show({
          title: 'Booking & Cancellation Policies',
          policyType: 'payment',
          onContinue: () => {
            launchPaymentGateway();
          }
        });
      } else {
        launchPaymentGateway();
      }
    });
  }

  function completeBookingWithRazorpay(paymentId) {
    const checkInDateObj = new Date(checkin);
    const checkOutDateObj = new Date(checkout);

    const bookingRecord = {
      id: bookingId,
      txnId: paymentId || 'TXN' + Date.now(),
      branch: branchName,
      hotelName: hotel ? hotel.name : 'Elegant Enclave Salem',
      image: hotel ? (hotel.imageUrl || hotel.image || '') : '',
      checkIn: new Date(checkin).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      checkInDay: checkInDateObj.toLocaleDateString('en-US', { weekday: 'long' }),
      checkOut: new Date(checkout).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      checkOutDay: checkOutDateObj.toLocaleDateString('en-US', { weekday: 'long' }),
      amount: total.toLocaleString('en-IN', { maximumFractionDigits: 0 }),
      status: 'Upcoming',
      email: guestDetails?.primaryGuest?.email || 'customer@hbs.local',
      hotelId: selection?.hotelId || 'HTL001',
      roomId: selection?.roomId || 'RM001',
      customerId: localStorage.getItem('userId') || 'USR001',
      nights: nights,
      adultsCount: selection?.adults || 1,
      childrenCount: selection?.children || 0,
      guestDetails: guestDetails || { primaryGuest: { name: 'Customer' } },
      totalAmount: baseAmount,
      taxAmount: gst,
      grandTotal: total,
      paymentStatus: 'Paid',
      paymentMethod: selectedPaymentMethod,
      bookingStatus: 'Confirmed',
      specialRequests: guestDetails?.specialRequests || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (window.HotelState) {
      const bookings = HotelState.bookings;
      bookings.push(bookingRecord);
      HotelState.bookings = bookings;
      HotelState.updateRoomStatus(selection?.roomId || 'RM001', 'Occupied');
      
      // Notifications
      const mockNotifs = HotelState.notifications;
      mockNotifs.unshift({
        id: 'NOTIF' + Date.now(),
        recipientId: localStorage.getItem('userId') || 'USR001',
        recipientRole: 'Customer',
        type: 'Booking',
        title: 'Booking Confirmed',
        message: `Your booking ${bookingId} at ${bookingRecord.hotelName} has been confirmed.`,
        isRead: false,
        createdAt: new Date().toISOString(),
        relatedId: bookingId
      });
      HotelState.notifications = mockNotifs;

      
      const userId = localStorage.getItem('userId') || 'USR001';
      const userObj = HotelState.getUserById(userId);
      const userName = userObj ? `${userObj.firstName} ${userObj.lastName}` : 'Customer';
      
    }

    sessionStorage.setItem('hbs_last_booking_id', bookingId);
    window.location.href = 'booking_success.html';
  }

  function saveFailedBooking() {
    const checkInDateObj = new Date(checkin);
    const checkOutDateObj = new Date(checkout);

    const bookingRecord = {
      id: bookingId,
      txnId: 'TXN_FAILED_' + Date.now(),
      branch: branchName,
      hotelName: hotel ? hotel.name : 'Elegant Enclave Salem',
      image: hotel ? (hotel.imageUrl || hotel.image || '') : '',
      checkIn: new Date(checkin).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      checkInDay: checkInDateObj.toLocaleDateString('en-US', { weekday: 'long' }),
      checkOut: new Date(checkout).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      checkOutDay: checkOutDateObj.toLocaleDateString('en-US', { weekday: 'long' }),
      amount: total.toLocaleString('en-IN', { maximumFractionDigits: 0 }),
      status: 'Upcoming',
      email: guestDetails?.primaryGuest?.email || 'customer@hbs.local',
      hotelId: selection?.hotelId || 'HTL001',
      roomId: selection?.roomId || 'RM001',
      customerId: localStorage.getItem('userId') || 'USR001',
      nights: nights,
      adultsCount: selection?.adults || 1,
      childrenCount: selection?.children || 0,
      guestDetails: guestDetails || { primaryGuest: { name: 'Customer' } },
      totalAmount: baseAmount,
      taxAmount: gst,
      grandTotal: total,
      paymentStatus: 'Failed',
      paymentMethod: selectedPaymentMethod,
      bookingStatus: 'Pending',
      specialRequests: guestDetails?.specialRequests || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (window.HotelState) {
      const bookings = HotelState.bookings;
      bookings.push(bookingRecord);
      HotelState.bookings = bookings;
      
      const userId = localStorage.getItem('userId') || 'USR001';
      const userObj = HotelState.getUserById(userId);
      const userName = userObj ? `${userObj.firstName} ${userObj.lastName}` : 'Customer';
      
    }
  }
});
