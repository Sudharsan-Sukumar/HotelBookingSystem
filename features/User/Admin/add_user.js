// Admin Session Check
const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');
const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

if (!isLoggedIn || userRole !== 'Admin') {
  window.location.href = '../../../features/Auth/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('addUserForm');
  const roleSelect = document.getElementById('role');
  const branchSelect = document.getElementById('branch');
  const passwordInput = document.getElementById('password');
  const btnTogglePassword = document.getElementById('btnTogglePassword');
  const btnCancel = document.getElementById('btnCancel');

  const successModalEl = document.getElementById('successModal');
  const successModal = new bootstrap.Modal(successModalEl);
  const successModalBody = document.getElementById('successModalBody');

  // Populate hotels dropdown
  if (window.HotelState) {
    const hotels = HotelState.hotels || [];
    hotels.forEach(h => {
      const opt = document.createElement('option');
      opt.value = h.id;
      opt.textContent = h.name;
      branchSelect.appendChild(opt);
    });
  }

  // Toggle Branch selection based on Role
  roleSelect.addEventListener('change', () => {
    const val = roleSelect.value;
    if (val === 'Manager') {
      branchSelect.disabled = false;
      branchSelect.required = true;
    } else {
      branchSelect.disabled = true;
      branchSelect.required = false;
      branchSelect.value = '';
    }
  });

  // Password Visibility Toggle
  btnTogglePassword.addEventListener('click', () => {
    const isPw = passwordInput.type === 'password';
    passwordInput.type = isPw ? 'text' : 'password';
    btnTogglePassword.innerHTML = isPw ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
  });

  // Cancel trigger
  btnCancel.addEventListener('click', () => {
    const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');
    let hasData = false;
    inputs.forEach(i => {
      if (i.value.trim()) hasData = true;
    });

    if (hasData) {
      if (confirm('Discard changes and return to User Management?')) {
        location.href = 'users.html';
      }
    } else {
      location.href = 'users.html';
    }
  });

  // Inline Validation Logic
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  
  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput.value.trim() || !emailRegex.test(emailInput.value)) {
      emailInput.classList.add('is-invalid');
      return false;
    }
    emailInput.classList.remove('is-invalid');
    return true;
  };
  
  const validatePhone = () => {
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneInput.value.trim() || !phoneRegex.test(phoneInput.value)) {
      phoneInput.classList.add('is-invalid');
      return false;
    }
    phoneInput.classList.remove('is-invalid');
    return true;
  };

  emailInput.addEventListener('input', validateEmail);
  phoneInput.addEventListener('input', validatePhone);

  // Submit & Validation
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Basic form validation check
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    requiredFields.forEach(f => {
      if (!f.value.trim()) {
        f.classList.add('is-invalid');
        isValid = false;
      } else {
        if (f.id !== 'email' && f.id !== 'phone') {
          f.classList.remove('is-invalid');
        }
      }
    });
    
    // Explicit inline validations
    if (!validateEmail()) isValid = false;
    if (!validatePhone()) isValid = false;

    // Password validation rule check
    const pw = passwordInput.value;
    if (pw.length < 8) {
      passwordInput.classList.add('is-invalid');
      isValid = false;
    }

    if (isValid) {
      const prefix = roleSelect.value === 'Customer' ? 'CUST' : roleSelect.value === 'Manager' ? 'MGR' : 'ADM';
      const mockId = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;

      const firstName = document.getElementById('firstName').value;
      const lastName = document.getElementById('lastName').value;
      const email = document.getElementById('email').value;
      const phone = document.getElementById('phone').value;
      
      const newUser = {
        id: mockId,
        firstName: firstName,
        lastName: lastName,
        name: `${firstName} ${lastName}`,
        email: email,
        password: pw,
        role: roleSelect.value,
        phone: phone,
        status: 'Active',
        assignedHotelId: roleSelect.value === 'Manager' ? branchSelect.value : null,
        branch: roleSelect.value === 'Manager' ? branchSelect.options[branchSelect.selectedIndex].text : 'N/A',
        createdAt: new Date().toISOString(),
        login: '-'
      };

      const usersList = HotelState.users;
      usersList.push(newUser);
      HotelState.users = usersList;

      successModalBody.innerHTML = `
        <p>The system credentials profile has been successfully configured.</p>
        <hr class="my-2">
        <p class="mb-1"><strong style="color: #1A0A2E;">User ID:</strong> ${mockId}</p>
        <p class="mb-1"><strong style="color: #1A0A2E;">User Name:</strong> ${firstName} ${lastName}</p>
        <p class="mb-1"><strong style="color: #1A0A2E;">Role Access:</strong> ${roleSelect.value}</p>
        <p class="mb-1"><strong style="color: #1A0A2E;">Branch Assignment:</strong> ${roleSelect.value === 'Manager' ? branchSelect.options[branchSelect.selectedIndex].text : 'N/A'}</p>
        <p class="mb-1"><strong style="color: #1A0A2E;">Temporary Password:</strong> ${pw}</p>
      `;

      successModal.show();
    }
  });

  successModalEl.addEventListener('hidden.bs.modal', () => {
    location.href = 'users.html';
  });
});
