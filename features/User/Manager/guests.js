document.addEventListener('DOMContentLoaded', () => {
  // 1. Mock Database representing Guest Records (Operational Front Office data)
  let guests = [
    {
      id: 'GUEST-001',
      name: 'Rajesh Kumar',
      email: 'rajesh.k@email.com',
      phone: '+91 98765 43210',
      avatar: '', 
      room: 'Room 201',
      stayDates: '25 Jun – 30 Jun 2026',
      visits: 12,
      spend: 245000,
      membership: 'VIP Gold',
      status: 'Staying',
      govId: 'Aadhaar: XXXX-XXXX-4321',
      emergencyContact: 'Suresh Kumar (+91 98765 43219)',
      preferences: 'High floor, Extra pillows',
      specialRequests: 'None',
      history: [
        { id: 'HBS-2026-001', branch: 'Coimbatore', room: 'Exec Studio 201', dates: '25 Jun – 30 Jun 2026', amount: '₹23,010', status: 'Checked In' }
      ]
    },
    {
      id: 'GUEST-002',
      name: 'Priya Sharma',
      email: 'priya.s@email.com',
      phone: '+91 87654 32109',
      avatar: '',
      room: 'Room 305',
      stayDates: '26 Jun – 29 Jun 2026',
      visits: 8,
      spend: 172500,
      membership: 'VIP Silver',
      status: 'Staying',
      govId: 'Passport: Z8765432',
      emergencyContact: 'Vijay Sharma (+91 87654 32199)',
      preferences: 'Near elevator, King bed',
      specialRequests: 'Anniversary cake in room',
      history: [
        { id: 'HBS-2026-002', branch: 'Coimbatore', room: 'Deluxe Suite 305', dates: '26 Jun – 29 Jun 2026', amount: '₹27,500', status: 'Checked In' }
      ]
    },
    {
      id: 'GUEST-003',
      name: 'Arun Menon',
      email: 'arun.m@email.com',
      phone: '+91 76543 21098',
      avatar: '',
      room: 'Check-out Today',
      stayDates: '27 Jun 2026',
      visits: 5,
      spend: 98300,
      membership: 'Regular',
      status: 'Checked Out',
      govId: 'DL: TN-37-2015-0987',
      emergencyContact: 'Latha Menon (+91 76543 21998)',
      preferences: 'Late checkout',
      specialRequests: 'None',
      history: [
        { id: 'HBS-2026-003', branch: 'Coimbatore', room: 'Standard 108', dates: '27 Jun – 30 Jun 2026', amount: '₹12,000', status: 'Checked Out' }
      ]
    },
    {
      id: 'GUEST-004',
      name: 'Meena Varma',
      email: 'meena.v@email.com',
      phone: '+91 65432 10987',
      avatar: '',
      room: 'Room 501',
      stayDates: '28 Jun – 02 Jul 2026',
      visits: 15,
      spend: 325800,
      membership: 'VIP Gold',
      status: 'Staying',
      govId: 'Passport: A1234567',
      emergencyContact: 'Karan Varma (+91 65432 19876)',
      preferences: 'Mountain view, Feather free bedding',
      specialRequests: 'Fruit basket requested',
      history: [
        { id: 'HBS-2026-004', branch: 'Coimbatore', room: 'Penthouse 501', dates: '28 Jun – 02 Jul 2026', amount: '₹45,000', status: 'Checked In' }
      ]
    },
    {
      id: 'GUEST-005',
      name: 'Suresh Patel',
      email: 'suresh.p@email.com',
      phone: '+91 54321 09876',
      avatar: '',
      room: 'Upcoming',
      stayDates: '01 Jul – 05 Jul 2026',
      visits: 3,
      spend: 45900,
      membership: 'Regular',
      status: 'Upcoming',
      govId: 'Aadhaar: XXXX-XXXX-9876',
      emergencyContact: 'Asha Patel (+91 54321 98765)',
      preferences: 'Extra towels',
      specialRequests: 'Extra rollaway bed in suite',
      history: []
    },
    {
      id: 'GUEST-006',
      name: 'Kavya Reddy',
      email: 'kavya.r@email.com',
      phone: '+91 43210 98765',
      avatar: '',
      room: '—',
      stayDates: '—',
      visits: 1,
      spend: 12500,
      membership: 'Regular',
      status: 'Blacklisted',
      govId: 'Passport: B9876543',
      emergencyContact: 'Ravi Reddy (+91 43210 98769)',
      preferences: 'Silent wing room',
      specialRequests: 'None',
      history: []
    },
    {
      id: 'GUEST-007',
      name: 'Mohan Verma',
      email: 'mohan.v@email.com',
      phone: '+91 32109 87654',
      avatar: '',
      room: 'Room 108',
      stayDates: '24 Jun – 28 Jun 2026',
      visits: 7,
      spend: 115700,
      membership: 'VIP Silver',
      status: 'Staying',
      govId: 'Aadhaar: XXXX-XXXX-1111',
      emergencyContact: 'Sunita Verma (+91 32109 87659)',
      preferences: 'Quiet room',
      specialRequests: 'None',
      history: []
    },
    {
      id: 'GUEST-008',
      name: 'Ananya Singh',
      email: 'ananya.s@email.com',
      phone: '+91 21098 76543',
      avatar: '',
      room: '—',
      stayDates: '—',
      visits: 4,
      spend: 67800,
      membership: 'Regular',
      status: 'Checked Out',
      govId: 'Passport: C7654321',
      emergencyContact: 'Rajesh Singh (+91 21098 76599)',
      preferences: 'Near pool',
      specialRequests: 'None',
      history: []
    }
  ];

  // DOM Elements
  const tblBody = document.querySelector('#tblGuestsManager tbody');
  const searchInput = document.getElementById('filterGuestSearch');
  const statusSelect = document.getElementById('filterGuestStatus');
  const visitsSelect = document.getElementById('filterGuestVisits');
  const emptyState = document.getElementById('guestEmptyState');
  const btnReset = document.getElementById('btnResetGuestFilters');
  const btnApply = document.getElementById('btnApplyGuestFilters');

  // Modals & Drawers
  const blacklistModal = new bootstrap.Modal(document.getElementById('blacklistModal'));
  const walkinModal = new bootstrap.Modal(document.getElementById('walkinRegistrationModal'));
  const profileDrawer = document.getElementById('profileDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const btnCloseDrawer = document.getElementById('btnCloseDrawer');

  let activeGuestForBlacklist = null;

  // Render main table rows
  function renderTable() {
    tblBody.innerHTML = '';
    const query = searchInput.value.toLowerCase().trim();
    const statusVal = statusSelect.value;
    const visitsVal = visitsSelect.value;

    let filtered = guests.filter(g => {
      // Search
      if (query && !g.name.toLowerCase().includes(query) && !g.id.toLowerCase().includes(query) && !g.email.toLowerCase().includes(query) && !g.phone.includes(query)) {
        return false;
      }
      // Status & Category filters
      if (statusVal !== 'all') {
        if (statusVal === 'Staying' && g.status !== 'Staying') return false;
        if (statusVal === 'Upcoming' && g.status !== 'Upcoming') return false;
        if (statusVal === 'Checked Out' && g.status !== 'Checked Out') return false;
        if (statusVal === 'Blacklisted' && g.status !== 'Blacklisted') return false;
        if (statusVal === 'Walk-in' && g.id.startsWith('GUEST-WALK')) return true; // mock filter helper
        if (statusVal === 'Frequent' && g.visits < 5) return false;
      }
      // Visit counts
      if (visitsVal !== 'all') {
        if (visitsVal === '1' && g.visits !== 1) return false;
        if (visitsVal === '2' && g.visits < 2) return false;
        if (visitsVal === '5' && g.visits < 5) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      emptyState.classList.remove('d-none');
    } else {
      emptyState.classList.add('d-none');
    }

    // Update Pagination and counters mock
    document.getElementById('lblGuestPaginationCount').textContent = `Showing 1 to ${filtered.length} of ${guests.length} entries`;

    filtered.forEach(g => {
      const tr = document.createElement('tr');
      
      // Status badge class tag config
      let statusBadgeClass = 'badge-cancelled';
      if (g.status === 'Staying') statusBadgeClass = 'badge-staying';
      else if (g.status === 'Upcoming') statusBadgeClass = 'badge-upcoming';
      else if (g.status === 'Checked Out') statusBadgeClass = 'badge-checkout';
      else if (g.status === 'Blacklisted') statusBadgeClass = 'badge-blacklisted';

      // Initials Circle fallback
      const nameParts = g.name.split(' ');
      const initials = nameParts.map(n => n[0]).join('').substring(0, 2).toUpperCase();

      tr.innerHTML = `
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="guest-photo-initials">${initials}</div>
            <div>
              <strong class="d-block text-dark small" style="font-weight: 700;">${g.name}</strong>
              <span class="text-muted" style="font-size: 0.7rem;">${g.id}</span>
            </div>
          </div>
        </td>
        <td>
          <div class="lh-sm">
            <span class="d-block small text-dark">${g.phone}</span>
            <span class="text-muted" style="font-size: 0.75rem;">${g.email}</span>
          </div>
        </td>
        <td>
          <div class="lh-sm">
            <span class="d-block small text-primary fw-bold" style="font-size: 0.8rem;">${g.room}</span>
            <span class="text-muted" style="font-size: 0.7rem;">${g.stayDates}</span>
          </div>
        </td>
        <td class="small fw-bold text-center">${g.visits}</td>
        <td class="small fw-bold">Rs. ${g.spend.toLocaleString('en-IN')}</td>
        <td><span class="badge ${statusBadgeClass}">${g.status}</span></td>
        <td class="text-end">
          <div class="d-inline-flex gap-1">
            <button class="btn action-icon-btn btn-view-profile" data-id="${g.id}" title="View Guest Details"><i class="bi bi-eye"></i></button>
            <button class="btn action-icon-btn btn-booking-history" data-id="${g.id}" title="Booking History"><i class="bi bi-calendar3"></i></button>
            <button class="btn action-icon-btn btn-email-guest" data-email="${g.email}" title="Email Guest"><i class="bi bi-envelope"></i></button>
            <button class="btn action-icon-btn btn-call-guest" data-phone="${g.phone}" title="Call Guest"><i class="bi bi-telephone"></i></button>
            <div class="dropdown d-inline-block">
              <button class="btn action-icon-btn dropdown-toggle no-caret" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-three-dots-vertical"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end shadow border" style="background-color: #FAF8F4;">
                <li><a class="dropdown-item btn-view-profile" href="#" data-id="${g.id}"><i class="bi bi-person me-2"></i> View Profile</a></li>
                <li><a class="dropdown-item" href="bookings.html"><i class="bi bi-pencil me-2"></i> Modify Reservation</a></li>
                <li><a class="dropdown-item text-danger btn-blacklist-trigger" href="#" data-id="${g.id}"><i class="bi bi-slash-circle me-2"></i> Blacklist Guest</a></li>
              </ul>
            </div>
          </div>
        </td>
      `;
      tblBody.appendChild(tr);
    });

    document.querySelectorAll('.btn-booking-history').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-id');
        openGuestDrawer(id);
        // Automatically expand the history accordion pane after drawer opens
        setTimeout(() => {
          const histCollapse = document.getElementById('histCol');
          if (histCollapse) {
            const bsCollapse = bootstrap.Collapse.getOrCreateInstance(histCollapse);
            bsCollapse.show();
          }
        }, 150);
      });
    });

    // Rebind newly created button handlers
    bindTableActions();
  }

  function bindTableActions() {
    document.querySelectorAll('.btn-view-profile').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-id');
        openGuestDrawer(id);
      });
    });

    document.querySelectorAll('.btn-blacklist-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        activeGuestForBlacklist = btn.getAttribute('data-id');
        blacklistModal.show();
      });
    });

    document.querySelectorAll('.btn-email-guest').forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.getAttribute('data-email');
        window.location.href = `mailto:${email}`;
      });
    });

    document.querySelectorAll('.btn-call-guest').forEach(btn => {
      btn.addEventListener('click', () => {
        const phone = btn.getAttribute('data-phone');
        window.location.href = `tel:${phone}`;
      });
    });
  }

  // Open side drawer with profile details
  function openGuestDrawer(id) {
    const g = guests.find(item => item.id === id);
    if (!g) return;

    const initials = g.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const container = document.getElementById('drawerProfileContent');

    // Build timeline/history elements
    let historyHTML = '';
    if (g.history && g.history.length > 0) {
      g.history.forEach(h => {
        historyHTML += `
          <div class="p-2 rounded border bg-white mb-2 shadow-sm" style="font-size: 0.8rem;">
            <div class="d-flex justify-content-between mb-1">
              <strong class="text-dark">${h.id}</strong>
              <span class="badge bg-success text-white" style="font-size: 0.65rem;">${h.status}</span>
            </div>
            <div class="text-muted">Room: ${h.room} | Dates: ${h.dates}</div>
            <div class="text-dark fw-bold mt-1">Paid: ${h.amount}</div>
          </div>
        `;
      });
    } else {
      historyHTML = `<p class="small text-muted mb-0">No past stay records found.</p>`;
    }

    container.innerHTML = `
      <div class="d-flex align-items-center gap-3 mb-4">
        <div class="guest-photo-initials" style="width: 64px; height: 64px; font-size: 1.5rem;">${initials}</div>
        <div>
          <h5 class="text-dark fw-bold mb-1">${g.name}</h5>
          <span class="small text-muted">ID: ${g.id}</span>
        </div>
      </div>

      <div class="accordion accordion-flush" id="profileAccordion">
        <div class="accordion-item" style="background: transparent;">
          <h2 class="accordion-header">
            <button class="accordion-button px-0 font-serif fw-bold text-dark" type="button" data-bs-toggle="collapse" data-bs-target="#infoCol" aria-expanded="true">
              Guest Information
            </button>
          </h2>
          <div id="infoCol" class="accordion-collapse collapse show">
            <div class="py-2 text-secondary" style="font-size: 0.85rem;">
              <div class="mb-2"><strong>Government ID:</strong> ${g.govId}</div>
              <div class="mb-2"><strong>Phone:</strong> ${g.phone}</div>
              <div class="mb-2"><strong>Email:</strong> ${g.email}</div>
              <div class="mb-2"><strong>Emergency Contact:</strong> ${g.emergencyContact}</div>
            </div>
          </div>
        </div>

        <div class="accordion-item" style="background: transparent;">
          <h2 class="accordion-header">
            <button class="accordion-button collapsed px-0 font-serif fw-bold text-dark" type="button" data-bs-toggle="collapse" data-bs-target="#prefCol">
              Preferences & Requests
            </button>
          </h2>
          <div id="prefCol" class="accordion-collapse collapse">
            <div class="py-2 text-secondary" style="font-size: 0.85rem;">
              <div class="mb-2"><strong>Room Preferences:</strong> ${g.preferences}</div>
              <div class="mb-2"><strong>Current Stay Notes:</strong> ${g.specialRequests}</div>
            </div>
          </div>
        </div>

        <div class="accordion-item" style="background: transparent;">
          <h2 class="accordion-header">
            <button class="accordion-button collapsed px-0 font-serif fw-bold text-dark" type="button" data-bs-toggle="collapse" data-bs-target="#histCol">
              Stay History
            </button>
          </h2>
          <div id="histCol" class="accordion-collapse collapse">
            <div class="py-2">
              ${historyHTML}
            </div>
          </div>
        </div>
      </div>

      <div class="mt-4 pt-3 border-top d-flex gap-2">
        <a class="btn btn-primary w-100" href="bookings.html" style="background-color: #1A0A2E; border-color: #D4AF37; color: #D4AF37; font-weight: 600;">Create Booking</a>
        <button class="btn btn-secondary w-100" style="background-color: #E2DCD0; border: none; color: #1A0A2E;" onclick="document.getElementById('btnCloseDrawer').click()">Close Details</button>
      </div>
    `;

    profileDrawer.classList.add('open');
    drawerBackdrop.classList.add('show');
  }

  function closeDrawer() {
    profileDrawer.classList.remove('open');
    drawerBackdrop.classList.remove('show');
  }

  // Handle blacklist submission
  document.getElementById('btnConfirmBlacklist').addEventListener('click', () => {
    const reason = document.getElementById('blacklistReasonSelect').value;
    const notes = document.getElementById('blacklistNotes').value.trim();

    if (!notes) {
      alert('Please enter justification notes.');
      return;
    }

    const g = guests.find(item => item.id === activeGuestForBlacklist);
    if (g) {
      g.status = 'Blacklisted';
      g.room = '—';
      g.stayDates = '—';
      
      // Dynamic updates to KPI cards count
      const activeBlacklistCount = guests.filter(item => item.status === 'Blacklisted').length;
      document.getElementById('kpiBlacklistGuests').textContent = activeBlacklistCount;
    }

    blacklistModal.hide();
    document.getElementById('blacklistNotes').value = '';
    renderTable();
  });

  // Handle Walk-in guest creation form submission
  const walkinForm = document.getElementById('frmWalkinGuest');
  
  // Setup live inline validation on input blur
  walkinForm.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('blur', () => {
      if (input.checkValidity()) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
      } else {
        input.classList.remove('is-valid');
        input.classList.add('is-invalid');
      }
    });
    
    // Clear validation styling when user starts re-typing
    input.addEventListener('input', () => {
      input.classList.remove('is-invalid');
      input.classList.remove('is-valid');
    });
  });

  walkinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Check global form validity
    if (!walkinForm.checkValidity()) {
      e.stopPropagation();
      walkinForm.querySelectorAll('input, select').forEach(input => {
        if (!input.checkValidity()) {
          input.classList.add('is-invalid');
        } else {
          input.classList.add('is-valid');
        }
      });
      return;
    }

    const first = document.getElementById('walkinFirst').value.trim();
    const last = document.getElementById('walkinLast').value.trim();
    const email = document.getElementById('walkinEmail').value.trim();
    const phone = document.getElementById('walkinPhone').value.trim();
    const idType = document.getElementById('walkinIdType').value;
    const idNum = document.getElementById('walkinIdNum').value.trim();

    const newGuest = {
      id: `GUEST-00${guests.length + 1}`,
      name: `${first} ${last}`,
      email: email,
      phone: phone,
      avatar: '',
      room: 'Room 101',
      stayDates: '29 Jun – 30 Jun 2026',
      visits: 1,
      spend: 12000,
      membership: 'Regular',
      status: 'Staying',
      govId: `${idType}: ${idNum}`,
      emergencyContact: 'Not Provided',
      preferences: 'Walk-in booking',
      specialRequests: 'None',
      history: []
    };

    guests.unshift(newGuest);

    // Close walkin modal
    walkinModal.hide();
    walkinForm.reset();
    
    // Remove validation visual states
    walkinForm.classList.remove('was-validated');
    walkinForm.querySelectorAll('input, select').forEach(input => {
      input.classList.remove('is-invalid');
      input.classList.remove('is-valid');
    });

    // Trigger updates
    document.getElementById('kpiTotalGuests').textContent = guests.length;
    renderTable();
  });

  // Walk-in nights dynamically recalculate payment amount
  document.getElementById('walkinStayLength').addEventListener('input', (e) => {
    const val = parseInt(e.target.value) || 1;
    const rate = document.getElementById('walkinRoomType').value === 'Penthouse Suite' ? 45000 : 12000;
    document.getElementById('walkinPaymentAmount').value = `₹${(val * rate).toLocaleString('en-IN')}`;
  });

  document.getElementById('walkinRoomType').addEventListener('change', (e) => {
    const val = parseInt(document.getElementById('walkinStayLength').value) || 1;
    const rate = e.target.value === 'Penthouse Suite' ? 45000 : 12000;
    document.getElementById('walkinPaymentAmount').value = `₹${(val * rate).toLocaleString('en-IN')}`;
  });

  // Triggers for buttons
  document.getElementById('btnRegisterWalkin').addEventListener('click', () => walkinModal.show());
  document.getElementById('quickRegister').addEventListener('click', () => walkinModal.show());
  document.getElementById('quickSearchBooking').addEventListener('click', () => { window.location.href = 'bookings.html'; });
  document.getElementById('quickCheckin').addEventListener('click', () => { window.location.href = 'bookings.html?action=checkin'; });
  document.getElementById('quickCheckout').addEventListener('click', () => { window.location.href = 'bookings.html?action=checkout'; });
  
  document.getElementById('quickExportReport').addEventListener('click', () => {
    alert('Exporting Guest List details to PDF report... Check your downloads folder.');
  });

  // Filters binding
  btnApply.addEventListener('click', renderTable);
  btnReset.addEventListener('click', () => {
    searchInput.value = '';
    statusSelect.value = 'all';
    visitsSelect.value = 'all';
    renderTable();
  });

  btnCloseDrawer.addEventListener('click', closeDrawer);
  drawerBackdrop.addEventListener('click', closeDrawer);

  // Initialize
  renderTable();
});
