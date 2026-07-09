// Admin Session Check
const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');
const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

if (!isLoggedIn || userRole !== 'Admin') {
  window.location.href = '../../../features/Auth/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  let users = HotelState.users || [];

  const tblBody = document.querySelector('#tblUsers tbody');
  const tblHeader = document.querySelector('#tblUsers thead');
  const userSearch = document.getElementById('userSearch');
  const roleFilter = document.getElementById('userRoleFilter');
  const statusFilter = document.getElementById('userStatusFilter');
  const branchFilter = document.getElementById('userBranchFilter');
  const btnReset = document.getElementById('btnResetFilters');
  const btnApply = document.getElementById('btnApplyFilters');
  const tabs = document.querySelectorAll('#userTabs .nav-link');

  let activeTab = 'all';

  function showToast(message, isSuccess = true) {
    const toastMessage = document.getElementById('toastMessage');
    const toastEl = document.getElementById('statusToast');
    if (toastEl) {
      toastEl.className = `toast align-items-center text-white border-0 shadow ${isSuccess ? 'bg-success' : 'bg-danger'}`;
      toastMessage.textContent = message;
      const toast = new bootstrap.Toast(toastEl);
      toast.show();
    }
  }

  window.navigateToView = function(id) {
    sessionStorage.setItem('adminViewUserId', id);
    location.href = 'view_user.html';
  };

  window.navigateToEdit = function(id) {
    sessionStorage.setItem('adminEditUserId', id);
    location.href = 'edit_manager.html';
  };

  window.navigateToViewBooking = function(id) {
    sessionStorage.setItem('adminViewBookingId', id);
    location.href = 'view_booking.html';
  };

  function renderTable() {
    users = HotelState.users || [];
    
    // Clear and adjust table header based on active tab
    tblBody.innerHTML = '';
    
    if (activeTab === 'Guests') {
      tblHeader.innerHTML = `
        <tr>
          <th>Guest Name</th>
          <th>Email Address</th>
          <th>Phone</th>
          <th>ID Type</th>
          <th>ID Number</th>
          <th>Booking Ref</th>
          <th>Hotel</th>
          <th>Stay Dates</th>
          <th class="text-end">Actions</th>
        </tr>
      `;

      // Extract guests from bookings
      const bookings = HotelState.bookings || [];
      const q = userSearch.value.toLowerCase().trim();

      let filteredGuests = [];
      bookings.forEach(b => {
        const pg = b.guestDetails?.primaryGuest || {};
        const name = pg.name || b.email || '';
        const email = pg.email || b.email || '';
        const phone = pg.phone || '';
        const idType = b.guestDetails?.idType || 'Aadhaar';
        const idNumber = b.guestDetails?.idNumber || 'N/A';
        const hotel = HotelState.getHotelById(b.hotelId)?.name || b.hotelId;
        const stayDates = `${b.checkIn} to ${b.checkOut}`;

        if (q && !name.toLowerCase().includes(q) && !email.toLowerCase().includes(q)) {
          return;
        }

        filteredGuests.push({
          name, email, phone, idType, idNumber, bookingId: b.id, hotel, stayDates
        });
      });

      if (filteredGuests.length === 0) {
        tblBody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No guest records found.</td></tr>`;
        return;
      }

      filteredGuests.forEach(g => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${g.name}</strong></td>
          <td>${g.email}</td>
          <td>${g.phone || '-'}</td>
          <td>${g.idType}</td>
          <td>${g.idNumber}</td>
          <td><span class="badge bg-secondary">${g.bookingId}</span></td>
          <td>${g.hotel}</td>
          <td>${g.stayDates}</td>
          <td class="text-end text-nowrap">
            <button class="btn btn-sm btn-outline-purple py-0 px-2" onclick="navigateToViewBooking('${g.bookingId}')"><i class="bi bi-eye-fill me-1"></i>View Booking</button>
          </td>
        `;
        tblBody.appendChild(tr);
      });

      return;
    }

    // Default users table header
    tblHeader.innerHTML = `
      <tr>
        <th>User ID</th>
        <th>Full Name</th>
        <th>Email Address</th>
        <th>Assigned Role</th>
        <th>Branch/Hotel</th>
        <th>Account Status</th>
        <th>Created/Last Login</th>
        <th class="text-end">Actions</th>
      </tr>
    `;

    const q = userSearch.value.toLowerCase().trim();
    const roleVal = roleFilter.value;
    const statusVal = statusFilter.value;
    const branchVal = branchFilter.value;

    let filtered = users.filter(u => {
      if (activeTab === 'Customer' && u.role !== 'Customer') return false;
      if (activeTab === 'Manager' && u.role !== 'Manager') return false;
      if (activeTab === 'Pending' && u.status !== 'Pending') return false;

      const name = (u.firstName && u.lastName) ? `${u.firstName} ${u.lastName}` : (u.name || '');
      if (q && !name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !u.id.toLowerCase().includes(q)) return false;
      if (roleVal !== 'all' && u.role !== roleVal) return false;
      if (statusVal !== 'all' && u.status !== statusVal) return false;
      
      if (branchVal !== 'all') {
        const hotelName = HotelState.getHotelById(u.assignedHotelId)?.name || u.branch || '';
        if (!hotelName.toLowerCase().includes(branchVal.toLowerCase())) return false;
      }
      return true;
    });

    document.getElementById('kpiTotal').textContent = users.length;
    document.getElementById('kpiCustomers').textContent = users.filter(x => x.role === 'Customer').length;
    document.getElementById('kpiManagers').textContent = users.filter(x => x.role === 'Manager').length;
    document.getElementById('kpiAdmins').textContent = users.filter(x => x.role === 'Admin').length;
    document.getElementById('kpiPending').textContent = users.filter(x => x.status === 'Pending').length;

    if (filtered.length === 0) {
      tblBody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No users found matching current criteria.</td></tr>`;
      return;
    }

    filtered.forEach(u => {
      let roleBadge = '';
      if (u.role === 'Customer') roleBadge = '<span class="badge bg-primary text-white">Customer</span>';
      else if (u.role === 'Manager') roleBadge = '<span class="badge bg-success text-white">Manager</span>';
      else roleBadge = '<span class="badge bg-purple text-white" style="background-color: purple !important;">Admin</span>';

      let statusBadge = '';
      if (u.status === 'Active') statusBadge = '<span class="badge bg-success">Active</span>';
      else if (u.status === 'Suspended') statusBadge = '<span class="badge bg-warning text-dark">Suspended</span>';
      else if (u.status === 'Inactive') statusBadge = '<span class="badge bg-danger">Inactive</span>';
      else statusBadge = `<span class="badge bg-secondary">${u.status}</span>`;

      let actions = '';
      if (u.status === 'Pending') {
        actions += `
          <button class="btn btn-sm btn-outline-success py-0 px-2 me-1" onclick="approveUser('${u.id}')">Approve</button>
          <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="rejectUser('${u.id}')">Reject</button>
        `;
      } else {
        actions += `
          <button class="btn btn-sm btn-outline-purple py-0 px-2 me-1" onclick="navigateToView('${u.id}')"><i class="bi bi-eye-fill me-1"></i>View</button>
        `;
        if (u.role === 'Manager') {
          actions += `
            <button class="btn btn-sm btn-outline-purple py-0 px-2 me-1" onclick="navigateToEdit('${u.id}')"><i class="bi bi-pencil-fill me-1"></i>Edit</button>
          `;
        }
        actions += `
          <button class="btn btn-sm btn-outline-purple py-0 px-2 me-1" onclick="resetPassword('${u.id}')">Reset PW</button>
          <button class="btn btn-sm btn-outline-danger py-0 px-2" onclick="deleteUser('${u.id}')">Delete</button>
        `;
      }

      const displayName = (u.firstName && u.lastName) ? `${u.firstName} ${u.lastName}` : (u.name || u.email);
      const branchDisplay = HotelState.getHotelById(u.assignedHotelId)?.name || u.branch || 'N/A';
      const createdDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : (u.login || '-');

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${u.id}</strong></td>
        <td>${displayName}</td>
        <td>${u.email}</td>
        <td>${roleBadge}</td>
        <td>${branchDisplay}</td>
        <td>${statusBadge}</td>
        <td>${createdDate}</td>
        <td class="text-end text-nowrap">${actions}</td>
      `;
      tblBody.appendChild(tr);
    });
  }

  window.approveUser = function(id) {
    const list = HotelState.users;
    const u = list.find(x => x.id === id);
    if (u) {
      u.status = 'Active';
      HotelState.users = list;

      showToast(`User ${u.firstName || u.name} approved.`, true);
      renderTable();
    }
  };

  window.rejectUser = function(id) {
    const list = HotelState.users;
    const idx = list.findIndex(x => x.id === id);
    if (idx !== -1) {
      const u = list[idx];
      list.splice(idx, 1);
      HotelState.users = list;

      showToast(`Pending user registration rejected.`, false);
      renderTable();
    }
  };

  window.resetPassword = function(id) {
    const u = HotelState.users.find(x => x.id === id);
    if (u) {
      showToast(`Temporary password generated and dispatched to ${u.email}`, true);
    }
  };

  const deleteModal = new bootstrap.Modal(document.getElementById('deleteUserReasonModal'));
  const deleteForm = document.getElementById('deleteUserReasonForm');

  window.deleteUser = function(id) {
    document.getElementById('deleteUserId').value = id;
    document.getElementById('deleteReasonInput').value = '';
    deleteModal.show();
  };

  deleteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('deleteUserId').value;
    const reason = document.getElementById('deleteReasonInput').value;

    if (!reason.trim()) return;

    const list = HotelState.users;
    const idx = list.findIndex(x => x.id === id);
    if (idx !== -1) {
      const u = list[idx];
      
      const bookingsCount = HotelState.getBookingsByCustomer(u.id).length;
      if (bookingsCount > 0) {
        u.status = 'Inactive';
        list[idx] = u;
        HotelState.users = list;
        showToast(`User has active bookings. Status set to 'Inactive' instead of deleting.`, true);
      } else {
        list.splice(idx, 1);
        HotelState.users = list;
        showToast(`Profile ${u.id} deleted.`, true);
      }

      renderTable();
      deleteModal.hide();
    }
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.getAttribute('data-tab');
      renderTable();
    });
  });

  if (btnApply) btnApply.addEventListener('click', renderTable);
  if (btnReset) btnReset.addEventListener('click', () => {
    userSearch.value = '';
    roleFilter.value = 'all';
    statusFilter.value = 'all';
    branchFilter.value = 'all';
    renderTable();
  });

  userSearch.addEventListener('input', renderTable);

  renderTable();
});
