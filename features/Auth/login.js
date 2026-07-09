// Force re-seed: if seedVersion in localStorage is outdated, clear and reload once
// NOTE: Do NOT set seedVersion here — let state.js set it after seeding on reload
(function() {
  const seedVersion = 4; // must match state.js SEED_VERSION
  const stored = localStorage.getItem('hbs_state_seedVersion');
  const storedVersion = stored ? JSON.parse(stored) : 0;
  if (storedVersion < seedVersion) {
    localStorage.clear();
    // Do NOT set seedVersion here — state.js will seed + set it on reload
    location.reload();
  }
})();

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const rememberMeCheckbox = document.getElementById('rememberMe');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  // Check for Redirect Password Reset Success Messages
  const successMsg = sessionStorage.getItem('resetSuccessMsg');
  if (successMsg) {
    alert(successMsg);
    sessionStorage.removeItem('resetSuccessMsg');
  }

  // Pre-fill email if remembered
  const rememberedEmail = localStorage.getItem('hbs_remembered_email');
  if (rememberedEmail && emailInput) {
    emailInput.value = rememberedEmail;
    if (rememberMeCheckbox) rememberMeCheckbox.checked = true;
  }

  // 1. Password Visibility Toggle
  const togglePasswordBtn = document.getElementById('togglePassword');
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      const icon = togglePasswordBtn.querySelector('i');
      if (icon) {
        icon.classList.toggle('bi-eye');
        icon.classList.toggle('bi-eye-slash');
      }
    });
  }

  // 2. Validate inputs
  function performFormValidation() {
    let isValid = true;

    // Reset error styling
    emailInput.classList.remove('is-invalid');
    passwordInput.classList.remove('is-invalid');
    if(emailError) emailError.textContent = '';
    if(passwordError) passwordError.textContent = '';

    // Validate email
    if (!emailInput.value.trim()) {
      emailInput.classList.add('is-invalid');
      if(emailError) emailError.textContent = 'Email Address is required.';
      isValid = false;
    } else if (typeof HBSValidation !== 'undefined' && !HBSValidation.isValidEmail(emailInput.value)) {
      emailInput.classList.add('is-invalid');
      if(emailError) emailError.textContent = 'Please enter a valid email address.';
      isValid = false;
    }

    // Validate password
    if (!passwordInput.value.trim()) {
      passwordInput.classList.add('is-invalid');
      if(passwordError) passwordError.textContent = 'Password is required.';
      isValid = false;
    }

    return isValid;
  }

  // 3. Form Submit Handler
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (performFormValidation()) {
        const enteredEmail = emailInput.value.trim().toLowerCase();
        const enteredPassword = passwordInput.value;

        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Authenticating...';

        // Simulate a slight network delay
        setTimeout(() => {
          try {
            const user = HotelState.authenticate(enteredEmail, enteredPassword);

            if (user) {
              // Store frontend session keys
              localStorage.setItem('isLoggedIn', 'true');
              localStorage.setItem('userName', user.firstName + ' ' + user.lastName);
              localStorage.setItem('userRole', user.role);
              localStorage.setItem('userEmail', user.email);
              localStorage.setItem('userId', user.id);

              // Remember Me
              if (rememberMeCheckbox && rememberMeCheckbox.checked) {
                localStorage.setItem('hbs_remembered_email', user.email);
              } else {
                localStorage.removeItem('hbs_remembered_email');
              }

              // Update Centralized State
              HotelState.set('currentUser', user);

              // Add Audit Log
              HotelState.addAuditLog(user.id, user.firstName + ' ' + user.lastName, user.role, 'LOGIN_SUCCESS', 'Auth', 'User logged in successfully.');

              // Redirect based on role
              if (user.role === 'Customer') {
                window.location.href = '../../features/User/Candidate/my_bookings.html';
              } else if (user.role === 'Manager') {
                window.location.href = '../../features/User/Manager/dashboard.html';
              } else if (user.role === 'Admin') {
                window.location.href = '../../features/User/Admin/dashboard.html';
              }
            } else {
              throw new Error('Invalid email or password.');
            }
          } catch (err) {
            console.error('Login error:', err);
            // Always re-enable button on failure
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            
            if (err.message === 'Invalid email or password.') {
              emailInput.classList.add('is-invalid');
              passwordInput.classList.add('is-invalid');
              if (emailError) emailError.textContent = 'Invalid email or password. Please try again.';
            } else {
              if (emailError) emailError.textContent = 'Something went wrong. Please refresh and try again.';
            }
          }
        }, 600);
      }
    });
  }
});
