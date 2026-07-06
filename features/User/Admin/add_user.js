document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('addUserForm');
  const roleSelect = document.getElementById('role');
  const branchSelect = document.getElementById('branch');
  const passwordInput = document.getElementById('password');
  const btnTogglePassword = document.getElementById('btnTogglePassword');
  const btnCancel = document.getElementById('btnCancel');

  const successModal = new bootstrap.Modal(document.getElementById('successModal'));
  const successModalBody = document.getElementById('successModalBody');

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
        f.classList.remove('is-invalid');
      }
    });

    // Password validation rule check
    const pw = passwordInput.value;
    if (pw.length < 8) {
      passwordInput.classList.add('is-invalid');
      isValid = false;
    }

    if (isValid) {
      // Mock generated ID
      const prefix = roleSelect.value === 'Customer' ? 'CUST' : roleSelect.value === 'Manager' ? 'MGR' : 'ADM';
      const mockId = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;

      successModalBody.innerHTML = `
        <p>The system credentials profile has been successfully configured.</p>
        <hr class="my-2">
        <p class="mb-1"><strong>User ID:</strong> ${mockId}</p>
        <p class="mb-1"><strong>User Name:</strong> ${document.getElementById('firstName').value} ${document.getElementById('lastName').value}</p>
        <p class="mb-1"><strong>Role Access:</strong> ${roleSelect.value}</p>
        <p class="mb-1"><strong>Branch Assignment:</strong> ${branchSelect.value || 'N/A'}</p>
        <p class="mb-1"><strong>Temporary Password:</strong> ${passwordInput.value}</p>
        <p class="mb-0"><strong>Dispatch Alert Email:</strong> ${document.getElementById('sendEmail').checked ? 'Sent' : 'None'}</p>
      `;

      successModal.show();
    }
  });
});
