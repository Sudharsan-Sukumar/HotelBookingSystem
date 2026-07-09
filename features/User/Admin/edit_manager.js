// Admin Session Check
const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');
const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

if (!isLoggedIn || userRole !== 'Admin') {
  window.location.href = '../../../features/Auth/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const editUserId = sessionStorage.getItem('adminEditUserId');

  if (!editUserId) {
    alert("No user specified to edit.");
    location.href = 'users.html';
    return;
  }

  // Load user data
  const usersList = HotelState.users;
  const uIndex = usersList.findIndex(x => x.id === editUserId);
  if (uIndex === -1) {
    alert("User not found!");
    location.href = 'users.html';
    return;
  }
  const u = usersList[uIndex];

  const form = document.getElementById('editManagerForm');
  const btnReset = document.getElementById('btnResetPassword');
  const btnDeactivate = document.getElementById('btnDeactivate');
  const notesTextarea = document.getElementById('adminNotes');
  const notesCount = document.getElementById('lblNotesCount');

  // Populate hotels dropdown
  const branchSelect = document.getElementById('branch');
  if (branchSelect && window.HotelState) {
    branchSelect.innerHTML = '<option value="">Select branch</option>';
    HotelState.hotels.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h.id;
      opt.textContent = h.name;
      branchSelect.appendChild(opt);
    });
  }

  // Populate form with existing data
  document.getElementById('firstName').value = u.firstName || u.name?.split(' ')[0] || '';
  document.getElementById('lastName').value = u.lastName || u.name?.split(' ').slice(1).join(' ') || '';
  document.getElementById('email').value = u.email || '';
  document.getElementById('phone').value = u.phone || '';
  document.getElementById('empId').value = u.id;
  if (branchSelect) branchSelect.value = u.assignedHotelId || '';
  document.getElementById('status').value = u.status || 'Active';

  // Update header status indicators if they exist
  const lblHeaderStatus = document.getElementById('lblHeaderStatus');
  const lblHeaderName = document.getElementById('lblHeaderName');
  const lblHeaderId = document.getElementById('lblHeaderId');

  if (lblHeaderName) lblHeaderName.textContent = u.firstName ? `${u.firstName} ${u.lastName}` : (u.name || u.email);
  if (lblHeaderId) lblHeaderId.textContent = u.id;
  if (lblHeaderStatus) {
    lblHeaderStatus.textContent = u.status;
    lblHeaderStatus.className = u.status === 'Active' ? 'badge bg-success-light text-success me-2' : 'badge bg-secondary-light text-secondary me-2';
  }

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

  // Character counter for admin notes
  if (notesTextarea) {
    notesTextarea.addEventListener('input', () => {
      const count = notesTextarea.value.length;
      if (notesCount) notesCount.textContent = `${count} / 250 characters`;
    });
  }

  // Password reset handler
  btnReset.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset password credentials for this manager?')) {
      showToast('Temporary password has been generated and dispatched to manager email.', true);
    }
  });

  // Deactivate handler
  btnDeactivate.addEventListener('click', () => {
    if (confirm('Deactivate Manager? The manager will lose system access immediately. Room and booking data remain unchanged.')) {
      document.getElementById('status').value = 'Inactive';
      if (lblHeaderStatus) {
        lblHeaderStatus.className = 'badge bg-secondary-light text-secondary me-2';
        lblHeaderStatus.textContent = 'Inactive';
      }
      showToast('Manager account deactivated successfully.', true);
    }
  });

  // Form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(f => {
      if (!f.value.trim()) {
        f.classList.add('is-invalid');
        isValid = false;
      } else {
        f.classList.remove('is-invalid');
      }
    });

    if (isValid) {
      const firstName = document.getElementById('firstName').value;
      const lastName = document.getElementById('lastName').value;
      
      u.firstName = firstName;
      u.lastName = lastName;
      u.name = `${firstName} ${lastName}`;
      u.email = document.getElementById('email').value;
      u.phone = document.getElementById('phone').value;
      u.assignedHotelId = branchSelect ? branchSelect.value : null;
      u.branch = branchSelect ? branchSelect.options[branchSelect.selectedIndex].text : 'N/A';
      u.status = document.getElementById('status').value;

      usersList[uIndex] = u;
      HotelState.users = usersList;

      showToast('Manager information updated successfully.', true);
      setTimeout(() => {
        sessionStorage.setItem('adminViewUserId', u.id);
        location.href = `view_user.html`;
      }, 1500);
    }
  });
});
