document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.d-flex.flex-column.gap-4');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const hotelId = urlParams.get('hotelId');

  const rawSearch = sessionStorage.getItem('hbs_booking_search');
  let searchState = null;
  if (rawSearch) {
    searchState = JSON.parse(rawSearch);
  } else {
    // Fallback if missing
    searchState = { checkIn: new Date().toISOString().split('T')[0], checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0] };
  }

  const hotel = HotelState.getHotelById(hotelId);
  if (!hotel) {
    container.innerHTML = '<div class="alert alert-danger">Hotel not found.</div>';
    return;
  }

  // Extract branch name (e.g., "Salem" from "Salem, Tamil Nadu")
  const branchName = hotel.location ? hotel.location.split(',')[0].trim() : 'Coimbatore';

  // Dynamic Title & Meta Description
  document.title = `Room Selection - ${branchName} | Elegant Enclave`;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) {
    metaDesc.setAttribute('content', `Select available rooms and view rates for ${branchName} Enclave branch accommodation options.`);
  }

  // Update Back to Hotel button link dynamically
  const backBtn = document.querySelector('.btn-back-to-hotel');
  if (backBtn && hotelId) {
    backBtn.href = `../hotels/hotel_details.html?hotelId=${hotelId}`;
  }

  // Update header titles
  const headerTitle = document.querySelector('.room-selection-title');
  const headerSub = document.querySelector('.room-selection-sub');
  if (headerTitle) headerTitle.textContent = `Select Room Type at ${hotel.name}`;
  if (headerSub) headerSub.textContent = `Choose available packages in ${branchName} Enclave branch`;

  // Calculate nights
  let nights = 1;
  if (searchState.checkIn && searchState.checkOut) {
    const ci = new Date(searchState.checkIn);
    const co = new Date(searchState.checkOut);
    const diffTime = Math.abs(co - ci);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0) nights = diffDays;
  }

  const availableRooms = HotelState.getRoomsByHotel(hotelId).filter(r => r.status === 'Available');

  // Deduplicate by room type to ensure only one of each category is displayed
  const uniqueRooms = [];
  const seenTypes = new Set();
  availableRooms.forEach(r => {
    if (!seenTypes.has(r.type)) {
      seenTypes.add(r.type);
      uniqueRooms.push(r);
    }
  });

  container.innerHTML = '';

  if (uniqueRooms.length === 0) {
    container.innerHTML = '<div class="alert alert-warning">No rooms available for this hotel.</div>';
    return;
  }

  uniqueRooms.forEach(room => {
    let pricePerNight = Number(room.pricePerNight);
    if (isNaN(pricePerNight)) pricePerNight = 4500;
    
    const formattedPrice = pricePerNight.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    
    const bedType = room.bedType || 'Queen Bed';
    const capacityObj = room.capacity || { adults: 2, children: 0 };
    const totalGuests = (capacityObj.adults || 2) + (capacityObj.children || 0);
    const capacityText = `${totalGuests}`;
    const amenities = room.amenities || [];
    
    let imgs = [];
    if (room.type.toLowerCase().includes('standard')) {
      imgs = [
        '../../../assets/images/rooms/standard/standard-1.jpg',
        '../../../assets/images/rooms/standard/standard-2.jpg',
        '../../../assets/images/rooms/standard/standard-3.jpg'
      ];
    } else if (room.type.toLowerCase().includes('deluxe')) {
      imgs = [
        '../../../assets/images/rooms/deluxe/deluxe-1.jpg',
        '../../../assets/images/rooms/deluxe/deluxe-2.jpg',
        '../../../assets/images/rooms/deluxe/deluxe-3.jpg'
      ];
    } else if (room.type.toLowerCase().includes('suite') && !room.type.toLowerCase().includes('presidential')) {
      imgs = [
        '../../../assets/images/rooms/suite/suite-1.jpg',
        '../../../assets/images/rooms/suite/suite-2.jpg',
        '../../../assets/images/rooms/suite/suite-3.jpg'
      ];
    } else if (room.type.toLowerCase().includes('presidential')) {
      imgs = [
        '../../../assets/images/rooms/presidential/presidential-1.jpg',
        '../../../assets/images/rooms/presidential/presidential-2.jpg',
        '../../../assets/images/rooms/presidential/presidential-3.jpg'
      ];
    } else {
      imgs = [
        '../../../assets/images/rooms/standard/standard-1.jpg',
        '../../../assets/images/rooms/standard/standard-2.jpg',
        '../../../assets/images/rooms/standard/standard-3.jpg'
      ];
    }
    
    const cardHtml = `
      <article class="room-card border rounded bg-white overflow-hidden" id="room_${room.id}">
        <div class="row align-items-center p-3 border-bottom g-3">
          <div class="col-md-4 d-flex align-items-center gap-3">
            <span class="room-icon-badge text-warning fs-4"><i class="bi bi-door-closed"></i></span>
            <h3 class="room-card-title m-0 fw-bold">${room.type} Room</h3>
          </div>
          <div class="col-6 col-md-2 text-md-center">
            <span class="d-inline-block d-md-none small text-muted text-uppercase me-2">Capacity:</span>
            <span class="fw-semibold text-dark"><i class="bi bi-people me-1"></i> ${capacityText} Guests</span>
          </div>
          <div class="col-6 col-md-2 text-md-center">
            <span class="d-inline-block d-md-none small text-muted text-uppercase me-2">Rate:</span>
            <span class="fw-bold text-dark fs-5">${formattedPrice}</span>
          </div>
          <div class="col-6 col-md-2 text-md-center">
            <span class="d-inline-block d-md-none small text-muted text-uppercase me-2">Left:</span>
            <span class="text-success fw-bold">Available</span>
          </div>
          <div class="col-6 col-md-2 text-md-center">
            <button class="btn btn-select-room w-100 py-2 btn-primary" data-id="${room.id}" data-price="${pricePerNight}" style="background-color:#1A0A2E; border:none; border-radius:6px;">Select Room <i class="bi bi-arrow-right ms-1"></i></button>
          </div>
        </div>

        <div class="p-3 bg-light">
          <div class="d-flex flex-wrap gap-2 mb-3">
            <span class="badge bg-secondary text-white"><i class="bi bi-info-circle me-1"></i> ${bedType}</span>
            ${amenities.map(a => `<span class="badge border text-dark bg-white">${a}</span>`).join('')}
          </div>
          
          <div id="carouselRoom${room.id}" class="carousel slide carousel-fade" data-bs-ride="false" style="border-radius: 8px; overflow: hidden; height: 350px;">
            <div class="carousel-indicators">
              <button type="button" data-bs-target="#carouselRoom${room.id}" data-bs-slide-to="0" class="active" aria-current="true" aria-label="Slide 1"></button>
              <button type="button" data-bs-target="#carouselRoom${room.id}" data-bs-slide-to="1" aria-label="Slide 2"></button>
              <button type="button" data-bs-target="#carouselRoom${room.id}" data-bs-slide-to="2" aria-label="Slide 3"></button>
            </div>
            <div class="carousel-inner h-100">
              <div class="carousel-item active h-100">
                <img src="${imgs[0]}" class="d-block w-100 h-100" style="object-fit: cover;" alt="${room.type} Image 1">
              </div>
              <div class="carousel-item h-100">
                <img src="${imgs[1]}" class="d-block w-100 h-100" style="object-fit: cover;" alt="${room.type} Image 2">
              </div>
              <div class="carousel-item h-100">
                <img src="${imgs[2]}" class="d-block w-100 h-100" style="object-fit: cover;" alt="${room.type} Image 3">
              </div>
            </div>
            <button class="carousel-control-prev" type="button" data-bs-target="#carouselRoom${room.id}" data-bs-slide="prev">
              <span class="carousel-control-prev-icon" aria-hidden="true"></span>
              <span class="visually-hidden">Previous</span>
            </button>
            <button class="carousel-control-next" type="button" data-bs-target="#carouselRoom${room.id}" data-bs-slide="next">
              <span class="carousel-control-next-icon" aria-hidden="true"></span>
              <span class="visually-hidden">Next</span>
            </button>
          </div>
        </div>
      </article>
    `;
    container.insertAdjacentHTML('beforeend', cardHtml);
  });

  document.querySelectorAll('.btn-select-room').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const roomId = e.currentTarget.getAttribute('data-id');
      const pricePerNight = parseFloat(e.currentTarget.getAttribute('data-price'));
      
      const totalAmount = pricePerNight * nights;
      const taxAmount = totalAmount * 0.18; // 18% GST
      const grandTotal = totalAmount + taxAmount;

      const hotel = HotelState.getHotelById(hotelId);
      const branchCode = hotel && hotel.location ? hotel.location.split(',')[0].trim().substring(0,3).toUpperCase() : 'COB';
      const randomDigits = Math.floor(1000 + Math.random() * 9000);
      const bookingId = `EE-${branchCode}-${new Date().getFullYear().toString().substr(-2)}-${randomDigits}`;

      const selection = {
        roomId: roomId,
        hotelId: hotelId,
        bookingId: bookingId,
        checkIn: searchState.checkIn,
        checkOut: searchState.checkOut,
        nights: nights,
        pricePerNight: pricePerNight,
        totalAmount: totalAmount,
        taxAmount: taxAmount,
        grandTotal: grandTotal,
        adults: searchState.adults,
        children: searchState.children
      };
      
      const roomObj = HotelState.getRoomById(roomId);
      localStorage.setItem('hbs_selected_room', JSON.stringify(roomObj));
      localStorage.setItem('hbs_booking_selection', JSON.stringify(selection));
      sessionStorage.setItem('hbs_booking_selection', JSON.stringify(selection));
      window.location.href = 'guest_details.html';
    });
  });

});
