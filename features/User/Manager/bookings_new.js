document.addEventListener('DOMContentLoaded', () => {
  let step = 1;
  const totalSteps = 9; // steps 1 to 9 (step 9 is Confirmation)

  // Wizard state parameters
  let guestData = { name: '', email: '', phone: '', doc: '' };
  let selectedBranch = 'Elegant Enclave Chennai';
  let checkinDate = '';
  let checkoutDate = '';
  let guestCount = { adults: 2, children: 0 };
  let selectedRoom = null;
  let extrasSelected = [];
  let baseAmount = 0;
  let totalAmount = 0;
  let paymentMethodCollected = 'Cash';

  const mockRooms = [
    { number: '101', type: 'Standard Room', price: 4000 },
    { number: '202', type: 'Executive Studio', price: 8000 },
    { number: '304', type: 'Deluxe Suite', price: 12000 },
    { number: '501', type: 'Penthouse Suite', price: 25000 }
  ];

  // Navigation UI bindings
  const btnNext = document.getElementById('btnWizardNext');
  const btnBack = document.getElementById('btnWizardBack');
  const controlsFooter = document.getElementById('wizardControls');
  
  function showToast(message, isSuccess = true) {
    const toastMessage = document.getElementById('toastMessage');
    const toastEl = document.getElementById('statusToast');
    toastEl.className = `toast align-items-center text-white border-0 shadow ${isSuccess ? 'bg-success' : 'bg-danger'}`;
    toastMessage.textContent = message;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }

  function validateStep(s) {
    if (s === 1) {
      const name = document.getElementById('newGuestName').value.trim();
      const email = document.getElementById('newGuestEmail').value.trim();
      const phone = document.getElementById('newGuestPhone').value.trim();
      const doc = document.getElementById('newGuestDoc').value;

      if (!name || !email || !phone || !doc) {
        showToast("Please fill all guest registration fields before proceeding.", false);
        return false;
      }
      guestData = { name, email, phone, doc };
      document.getElementById('sideGuest').textContent = name;
    }

    if (s === 2) {
      selectedBranch = document.getElementById('bookingBranch').value;
      document.getElementById('sideBranch').textContent = selectedBranch;
    }

    if (s === 3) {
      const chin = document.getElementById('bookingCheckin').value;
      const chout = document.getElementById('bookingCheckout').value;
      if (!chin || !chout) {
        showToast("Please select valid check-in and check-out dates.", false);
        return false;
      }
      if (new Date(chin) < new Date(new Date().toDateString())) {
        showToast("Cannot select past check-in dates.", false);
        return false;
      }
      if (new Date(chin) >= new Date(chout)) {
        showToast("Check-out date must fall after Check-in date.", false);
        return false;
      }
      checkinDate = chin;
      checkoutDate = chout;
      document.getElementById('sideDates').textContent = `${chin} to ${chout}`;
    }

    if (s === 4) {
      guestCount.adults = parseInt(document.getElementById('bookingAdults').value);
      guestCount.children = parseInt(document.getElementById('bookingChildren').value);
      renderAvailableRooms();
    }

    if (s === 5) {
      if (!selectedRoom) {
        showToast("Please select one of the available rooms.", false);
        return false;
      }
    }

    if (s === 6) {
      // Collect extras
      extrasSelected = [];
      if (document.getElementById('extraBreakfast').checked) extrasSelected.push('Breakfast');
      if (document.getElementById('extraAirport').checked) extrasSelected.push('Airport Pickup');
      if (document.getElementById('extraBed').checked) extrasSelected.push('Extra Bed');
      populateSummary();
    }

    if (s === 7) {
      // Move to payment step
      document.getElementById('paymentAmountSpan').textContent = `₹${totalAmount.toLocaleString('en-IN')}`;
    }

    if (s === 8) {
      paymentMethodCollected = document.getElementById('paymentMethod').value;
      // Complete confirmation parameters
      const genId = 'EE-2026-' + Math.floor(1000 + Math.random() * 9000);
      document.getElementById('confirmedIdSpan').textContent = genId;
      document.getElementById('confirmedRoomSpan').textContent = selectedRoom.number;
      showToast("Walk-in booking created successfully. Ledger updated.", true);
    }

    return true;
  }

  function showPane(s) {
    document.querySelectorAll('.wizard-pane').forEach(p => p.classList.add('d-none'));
    const target = document.getElementById(`pane-${s}`);
    if (target) target.classList.remove('d-none');

    // Update badges
    const badges = document.querySelectorAll('.wizard-step-badge');
    badges.forEach((b, idx) => {
      b.className = 'wizard-step-badge';
      if (idx + 1 < s) {
        b.classList.add('completed');
      } else if (idx + 1 === s) {
        b.classList.add('active');
      }
    });

    if (s === 1) {
      btnBack.classList.add('d-none');
    } else {
      btnBack.classList.remove('d-none');
    }

    if (s === 9) {
      controlsFooter.classList.add('d-none');
    } else {
      controlsFooter.classList.remove('d-none');
      btnNext.textContent = (s === 8) ? 'Pay & Confirm' : 'Next Step';
    }
  }

  function renderAvailableRooms() {
    const container = document.getElementById('availableRoomsContainer');
    container.innerHTML = '';

    mockRooms.forEach(r => {
      const col = document.createElement('div');
      col.className = 'col-md-6';
      col.innerHTML = `
        <div class="card p-3 border rounded cursor-pointer available-room-card ${selectedRoom && selectedRoom.number === r.number ? 'border-warning bg-light' : ''}" style="cursor: pointer;" onclick="selectRoomCard('${r.number}', ${r.price})">
          <strong class="text-purple d-block">Room ${r.number}</strong>
          <span class="small text-secondary">${r.type}</span>
          <span class="small text-dark fw-bold d-block mt-2">₹${r.price.toLocaleString('en-IN')}/night</span>
        </div>
      `;
      container.appendChild(col);
    });
  }

  window.selectRoomCard = function(num, price) {
    selectedRoom = mockRooms.find(r => r.number === num);
    baseAmount = price;
    // Highlight
    document.querySelectorAll('.available-room-card').forEach(card => card.classList.remove('border-warning', 'bg-light'));
    event.currentTarget.classList.add('border-warning', 'bg-light');
    document.getElementById('sideRoom').textContent = `Room ${num} (${selectedRoom.type})`;
    calculateCost();
  };

  function calculateCost() {
    if (!checkinDate || !checkoutDate || !selectedRoom) return;
    const diff = new Date(checkoutDate) - new Date(checkinDate);
    const nights = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    
    let extraCost = 0;
    if (extrasSelected.includes('Breakfast')) extraCost += 500 * nights;
    if (extrasSelected.includes('Airport Pickup')) extraCost += 1200;
    if (extrasSelected.includes('Extra Bed')) extraCost += 1000 * nights;

    totalAmount = (baseAmount * nights) + extraCost;
    document.getElementById('sideAmount').textContent = `₹${totalAmount.toLocaleString('en-IN')}`;
  }

  function populateSummary() {
    calculateCost();
    const diff = new Date(checkoutDate) - new Date(checkinDate);
    const nights = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));

    const summary = document.getElementById('bookingSummaryContent');
    summary.innerHTML = `
      <div class="border p-3 rounded text-start">
        <p class="mb-1"><strong>Guest:</strong> ${guestData.name} (${guestData.email})</p>
        <p class="mb-1"><strong>Phone:</strong> ${guestData.phone}</p>
        <p class="mb-1"><strong>Document:</strong> ${guestData.doc}</p>
        <hr class="my-2">
        <p class="mb-1"><strong>Stay:</strong> ${checkinDate} to ${checkoutDate} (${nights} Nights)</p>
        <p class="mb-1"><strong>Branch:</strong> ${selectedBranch}</p>
        <p class="mb-1"><strong>Room:</strong> Room ${selectedRoom.number} (${selectedRoom.type})</p>
        <p class="mb-1"><strong>Extras Selected:</strong> ${extrasSelected.length > 0 ? extrasSelected.join(', ') : 'None'}</p>
        <hr class="my-2">
        <h5 class="text-purple fw-bold mb-0">Total Amount: ₹${totalAmount.toLocaleString('en-IN')}</h5>
      </div>
    `;
  }

  btnNext.addEventListener('click', () => {
    if (validateStep(step)) {
      step++;
      showPane(step);
    }
  });

  btnBack.addEventListener('click', () => {
    if (step > 1) {
      step--;
      showPane(step);
    }
  });

  document.getElementById('btnSearchGuest').addEventListener('click', () => {
    const query = document.getElementById('guestSearchQuery').value.trim();
    if (query) {
      // Mock result fill
      document.getElementById('newGuestName').value = "Arjun Mehta";
      document.getElementById('newGuestEmail').value = "arjun@email.com";
      document.getElementById('newGuestPhone').value = "+91 98765 43210";
      document.getElementById('newGuestDoc').value = "Aadhaar Card";
      showToast("Found registered guest profile matches.", true);
    } else {
      showToast("Please input a search parameter.", false);
    }
  });
});
