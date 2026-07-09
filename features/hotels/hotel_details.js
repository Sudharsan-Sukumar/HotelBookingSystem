document.addEventListener('DOMContentLoaded', () => {
  const mainGalleryDisplay = document.getElementById('mainGalleryDisplay');
  const thumbnailCards = document.querySelectorAll('.thumbnail-card');
  const btnPrev = document.getElementById('btnPrevImage');
  const btnNext = document.getElementById('btnNextImage');

  const urlParams = new URLSearchParams(window.location.search);
  const hotelId = urlParams.get('hotelId') || 'HTL002'; // default Coimbatore if none

  const hotel = window.HotelState ? HotelState.getHotelById(hotelId) : null;
  if (hotel) {
    const titleEl = document.getElementById('lblDetailsTitle');
    if (titleEl) titleEl.textContent = hotel.name;

    const branchName = hotel.location ? hotel.location.split(',')[0].trim() : 'Coimbatore';
    document.title = `${hotel.name} | Elegant Enclave`;

    const addressSpan = document.querySelector('.overview-list li:nth-child(1) span');
    if (addressSpan) addressSpan.textContent = hotel.address || hotel.location;

    const ratingSpan = document.querySelector('.overview-list li:nth-child(2) span');
    if (ratingSpan) ratingSpan.textContent = `${hotel.rating || 5} - Star Class`;

    const emailSpan = document.querySelector('.overview-list li:nth-child(3) span');
    if (emailSpan) emailSpan.textContent = hotel.contactEmail || 'contact@elegantenclave.com';

    const phoneSpan = document.querySelector('.overview-list li:nth-child(4) span');
    if (phoneSpan) phoneSpan.textContent = hotel.contactPhone || '+91 422 990 000';

    const mainGalleryImg = document.getElementById('mainGalleryDisplay');
    if (mainGalleryImg) {
      const rawImg = hotel.imageUrl || hotel.image || '';
      if (rawImg) {
        const imgSrc = rawImg.replace(/^(\.\.\/)+assets\//, '../../assets/');
        mainGalleryImg.src = imgSrc;
        
        // Update first thumbnail preview
        const firstThumbnailCard = document.querySelector('.thumbnail-card');
        const firstThumbnailImg = document.querySelector('.thumbnail-card img');
        if (firstThumbnailCard && firstThumbnailImg) {
          firstThumbnailCard.setAttribute('data-src', imgSrc);
          firstThumbnailImg.src = imgSrc;
        }
      }
    }
  }

  let currentGalleryIndex = 0;
  // Recalculate gallery images array in case thumbnails were modified
  const galleryImages = Array.from(thumbnailCards).map(card => card.getAttribute('data-src') || card.dataset.src);

  // 1. Gallery Thumbnail Swapper click
  thumbnailCards.forEach((card, index) => {
    card.addEventListener('click', () => {
      currentGalleryIndex = index;
      updateActiveGalleryItem();
    });
  });

  // Slider Navigation Arrows
  if (btnPrev && btnNext) {
    btnPrev.addEventListener('click', () => {
      currentGalleryIndex = (currentGalleryIndex - 1 + galleryImages.length) % galleryImages.length;
      updateActiveGalleryItem();
    });

    btnNext.addEventListener('click', () => {
      currentGalleryIndex = (currentGalleryIndex + 1) % galleryImages.length;
      updateActiveGalleryItem();
    });
  }

  function updateActiveGalleryItem() {
    mainGalleryDisplay.style.opacity = '0.3';
    
    setTimeout(() => {
      mainGalleryDisplay.src = galleryImages[currentGalleryIndex];
      mainGalleryDisplay.style.opacity = '1';
    }, 150);

    thumbnailCards.forEach((card, idx) => {
      if (idx === currentGalleryIndex) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
  }

  // 2. Book Now CTA click action redirection
  const btnBookNow = document.getElementById('btnBookNowDetails');
  if (btnBookNow) {
    btnBookNow.addEventListener('click', () => {
      window.policyModal.show({
        title: 'Review Room Booking Policies',
        policyType: 'booking',
        onContinue: () => {
          const originalText = btnBookNow.innerHTML;
          btnBookNow.setAttribute('disabled', 'true');
          btnBookNow.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving Selection...';

          setTimeout(() => {
            btnBookNow.removeAttribute('disabled');
            btnBookNow.innerHTML = originalText;
            window.location.href = `../bookings/room_selection.html?hotelId=${hotelId}`;
          }, 1000);
        },
        onBack: () => {
          console.log('User cancelled booking policy agreement');
        }
      });
    });
  }
});
