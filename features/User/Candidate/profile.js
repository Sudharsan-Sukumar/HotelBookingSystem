document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('profileForm');
  
  // Verify auth session credentials. Hide data if unauthenticated.
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) {
    if (form) {
      form.innerHTML = `
        <div class="profile-card bg-white p-5 rounded border text-center shadow-sm my-4">
          <div class="mb-4 text-warning" style="font-size: 3rem;"><i class="bi bi-shield-lock"></i></div>
          <h3 class="font-serif text-dark mb-3">Login to View Profile</h3>
          <p class="text-muted mb-4 small">You must be logged in to view your profile settings and update credentials.</p>
          <a href="../authentication/login.html" class="btn btn-confirm-pay px-4 py-2" style="background-color: #1A0A2E; color: white; border-radius: 8px;">Login to Continue</a>
        </div>
      `;
    }
    return;
  }

  // Inputs fields
  const firstName = document.getElementById('firstName');
  const lastName = document.getElementById('lastName');
  const mobilePhone = document.getElementById('mobilePhone');
  const newPassword = document.getElementById('newPassword');
  const oldPassword = document.getElementById('oldPassword');

  // Error placeholders
  const firstNameErr = document.getElementById('firstNameErr');
  const lastNameErr = document.getElementById('lastNameErr');
  const mobilePhoneErr = document.getElementById('mobilePhoneErr');
  const newPasswordErr = document.getElementById('newPasswordErr');

  // Toggle show/hide password buttons
  const btnToggleOld = document.getElementById('btnToggleOld');
  const btnToggleNew = document.getElementById('btnToggleNew');

  function setupToggleVisibility(btn, inputField) {
    if (btn && inputField) {
      btn.addEventListener('click', () => {
        if (inputField.type === 'password') {
          inputField.type = 'text';
          btn.innerHTML = '<i class="bi bi-eye-slash"></i>';
        } else {
          inputField.type = 'password';
          btn.innerHTML = '<i class="bi bi-eye"></i>';
        }
      });
    }
  }

  setupToggleVisibility(btnToggleOld, oldPassword);
  setupToggleVisibility(btnToggleNew, newPassword);

  // Live password strength indicator logs
  if (newPassword) {
    newPassword.addEventListener('input', () => {
      const val = newPassword.value;
      const strengthStatusText = document.getElementById('strengthStatusText');
      const bars = document.querySelectorAll('.strength-bar');

      // Clear bar states
      bars.forEach(b => {
        b.className = 'strength-bar text-muted bg-light';
      });

      if (val.length === 0) {
        if (strengthStatusText) strengthStatusText.textContent = '';
        return;
      }

      let score = 0;
      if (val.length >= 8) score++;
      if (/[A-Z]/.test(val)) score++;
      if (/[a-z]/.test(val)) score++;
      if (/[0-9]/.test(val)) score++;
      if (/[^A-Za-z0-9]/.test(val)) score++;

      if (score <= 2) {
        bars[0].className = 'strength-bar weak';
        if (strengthStatusText) {
          strengthStatusText.textContent = 'Weak';
          strengthStatusText.className = 'small text-danger fw-bold';
        }
      } else if (score <= 4) {
        bars[0].className = 'strength-bar medium';
        bars[1].className = 'strength-bar medium';
        if (strengthStatusText) {
          strengthStatusText.textContent = 'Medium';
          strengthStatusText.className = 'small text-warning fw-bold';
        }
      } else {
        bars[0].className = 'strength-bar strong';
        bars[1].className = 'strength-bar strong';
        bars[2].className = 'strength-bar strong';
        if (strengthStatusText) {
          strengthStatusText.textContent = 'Strong';
          strengthStatusText.className = 'small text-success fw-bold';
        }
      }
    });
  }

  // Submit Handler Validations
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      let hasError = false;

      // 1. First Name Validation
      const nameRegex = /^[A-Za-z\s]+$/;
      if (!firstName.value.trim() || !nameRegex.test(firstName.value) || firstName.value.length > 50) {
        firstNameErr.classList.remove('d-none');
        hasError = true;
      } else {
        firstNameErr.classList.add('d-none');
      }

      // 2. Last Name Validation
      if (!lastName.value.trim() || !nameRegex.test(lastName.value) || lastName.value.length > 50) {
        lastNameErr.classList.remove('d-none');
        hasError = true;
      } else {
        lastNameErr.classList.add('d-none');
      }

      // 3. Phone Validation (Indian, exactly 10 digits parsed)
      const cleanPhone = mobilePhone.value.replace(/[^0-9]/g, '');
      if (cleanPhone.length < 10) {
        mobilePhoneErr.classList.remove('d-none');
        hasError = true;
      } else {
        mobilePhoneErr.classList.add('d-none');
      }

      // 4. New Password validation check
      const passVal = newPassword.value;
      const meetsPass = passVal.length >= 8 && /[A-Z]/.test(passVal) && /[a-z]/.test(passVal) && /[0-9]/.test(passVal) && /[^A-Za-z0-9]/.test(passVal);
      if (passVal.length > 0 && !meetsPass) {
        newPasswordErr.classList.remove('d-none');
        hasError = true;
      } else {
        newPasswordErr.classList.add('d-none');
      }

      if (hasError) {
        return;
      }

      // Show Policy Confirmation modal before saving modifications
      window.policyModal.show({
        title: 'Review Profile & Security Policy',
        policyType: 'profile',
        onContinue: () => {
           // Sync updated name variables back to global session variables
          const updatedName = `${firstName.value.trim()} ${lastName.value.trim()}`;
          localStorage.setItem('userName', updatedName);
          
          // Re-populate page navigation avatar details
          const userNameEl = document.querySelector('.auth-logged-in .user-name');
          if (userNameEl) userNameEl.textContent = updatedName;

          // If there is an email input or display, it can be updated here as well:
          const userEmailEl = document.querySelector('.auth-logged-in .user-email');
          const emailInput = document.getElementById('emailAddress');
          if (userEmailEl && emailInput) {
            const updatedEmail = emailInput.value.trim();
            if (updatedEmail) {
              localStorage.setItem('userEmail', updatedEmail);
              userEmailEl.textContent = updatedEmail;
            }
          }

          // Trigger success Toast popup
          const toastEl = document.getElementById('successToast');
          if (toastEl) {
            const toast = new bootstrap.Toast(toastEl);
            toast.show();
          }
        },
        onBack: () => {
          console.log('User cancelled profile policy agreement');
        }
      });
    });
  }
});
