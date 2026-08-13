document.addEventListener('DOMContentLoaded', () => {
  const bookingId = sessionStorage.getItem('hbs_last_booking_id');
  if (!bookingId) {
    window.location.href = '../hotels/search_results.html';
    return;
  }

  const booking = HotelState.bookings.find(b => b.id === bookingId);
  if (!booking) {
    window.location.href = '../hotels/search_results.html';
    return;
  }

  // Populate Fields
  const e = (id, text) => {
    const el = document.getElementById(id);
    if (el) {
      if (id === 'successHotelImg') el.src = text;
      else el.textContent = text;
    }
  };

  e('bookingRefText', booking.id);
  e('successBannerText', `Confirmed stay record at ${booking.hotelName} for ${booking.checkIn}.`);
  e('successHotelImg', booking.image);
  e('successHotelName', booking.hotelName);
  
  // Try to extract room type from roomID if possible
  const room = HotelState.getRoomsByHotel(booking.hotelId).find(r => r.id === booking.roomId);
  const roomName = room ? `${room.type} Room` : `Room ${booking.roomId}`;
  e('successHotelBranchRoom', `${booking.branch} Branch - ${roomName}`);
  
  e('successCheckInDate', booking.checkIn);
  e('successCheckInDay', booking.checkInDay);
  e('successCheckOutDate', booking.checkOut);
  e('successCheckOutDay', booking.checkOutDay);
  e('successDuration', `${booking.nights} Night${booking.nights > 1 ? 's' : ''}`);
  e('successGuests', `${booking.adultsCount + booking.childrenCount} Guest${(booking.adultsCount + booking.childrenCount) > 1 ? 's' : ''}`);
  e('successRooms', `1 Room`);
  
  e('payMethodText', booking.paymentMethod);
  e('successTotalAmount', booking.grandTotal.toLocaleString('en-IN', { style: 'currency', currency: 'INR' }));
  e('txnIdText', booking.txnId);
  
  if (booking.guestDetails && booking.guestDetails.primaryGuest) {
    e('successEmail', booking.guestDetails.primaryGuest.email);
  } else {
    e('successEmail', booking.email);
  }

  // Bind Buttons
  const btnViewLog = document.getElementById('btnViewLog');
  if (btnViewLog) {
    btnViewLog.addEventListener('click', () => {
      window.location.href = '../../features/User/Candidate/my_bookings.html';
    });
  }
  
  // Map download ticket
  const btnDownloadTicket = document.getElementById('btnDownloadTicket');
  if (btnDownloadTicket) {
    btnDownloadTicket.addEventListener('click', (e) => {
      sessionStorage.setItem('invoiceBookingId', booking.id);
    });
  }

  const btnReturnDashboard = document.getElementById('btnReturnDashboard');
  if (btnReturnDashboard) {
    btnReturnDashboard.addEventListener('click', () => {
      window.location.href = '../../index.html';
    });
  }

  // Clear booking flow state
  sessionStorage.removeItem('hbs_booking_search');
  sessionStorage.removeItem('hbs_booking_selection');
  sessionStorage.removeItem('hbs_booking_guest');

  localStorage.removeItem('hbs_booking_selection');
  localStorage.removeItem('hbs_booking_guest');
  localStorage.removeItem('hbs_selected_room');
});
