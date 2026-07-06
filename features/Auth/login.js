document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const showPasswordCheckbox = document.getElementById('showPassword');
  
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');

  // Predefined authentication dummy credentials
  const predefinedAccounts = [
    {
      email: 'bennet@hbs.local',
      password: 'Customer@123',
      name: 'Bennett',
      role: 'Customer'
    },
    {
      email: 'chennaimanager@hbs.local',
      password: 'Manager@123',
      name: 'Chennai Manager',
      role: 'Manager',
      branch: 'Chennai'
    },
    {
      email: 'coimbatoremanager@hbs.local',
      password: 'Manager@123',
      name: 'Coimbatore Manager',
      role: 'Manager',
      branch: 'Coimbatore'
    },
    {
      email: 'admin@hbs.local',
      password: 'Admin@123',
      name: 'System Administrator',
      role: 'Admin'
    }
  ];

  // Check for Redirect Password Reset Success Messages
  const successMsg = sessionStorage.getItem('resetSuccessMsg');
  if (successMsg) {
    alert(successMsg);
    sessionStorage.removeItem('resetSuccessMsg');
  }

  // 1. Password Visibility Toggle
  if (showPasswordCheckbox && passwordInput) {
    showPasswordCheckbox.addEventListener('change', () => {
      passwordInput.type = showPasswordCheckbox.checked ? 'text' : 'password';
    });
  }

  // Helper validation tools
  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  }

  // 2. Validate inputs
  function performFormValidation() {
    let isValid = true;

    // Reset error styling
    emailInput.classList.remove('is-invalid');
    passwordInput.classList.remove('is-invalid');
    emailError.textContent = '';
    passwordError.textContent = '';

    // Validate email
    if (!emailInput.value.trim()) {
      emailInput.classList.add('is-invalid');
      emailError.textContent = 'Email Address is required.';
      isValid = false;
    } else if (!validateEmail(emailInput.value)) {
      emailInput.classList.add('is-invalid');
      emailError.textContent = 'Please enter a valid email address.';
      isValid = false;
    }

    // Validate password
    if (!passwordInput.value.trim()) {
      passwordInput.classList.add('is-invalid');
      passwordError.textContent = 'Password is required.';
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

        // Compare credentials
        const matchedAccount = predefinedAccounts.find(
          acc => acc.email.toLowerCase() === enteredEmail && acc.password === enteredPassword
        );

        if (matchedAccount) {
          // Store frontend session
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('userRole', matchedAccount.role);
          localStorage.setItem('userName', matchedAccount.name);
          localStorage.setItem('userEmail', matchedAccount.email);
          if (matchedAccount.branch) {
            localStorage.setItem('userBranch', matchedAccount.branch);
          } else {
            localStorage.removeItem('userBranch');
          }

          alert(`Successfully Authenticated!\nWelcome back, ${matchedAccount.name}`);
          if (matchedAccount.role === 'Manager') {
            window.location.href = '../manager/dashboard.html';
          } else if (matchedAccount.role === 'Admin') {
            window.location.href = '../admin/dashboard.html';
          } else {
            window.location.href = '../../index.html';
          }
        } else {
          // Display general error message without revealing exact credentials info
          emailInput.classList.add('is-invalid');
          passwordInput.classList.add('is-invalid');
          emailError.textContent = 'Invalid email or password.';
        }
      }
    });
  }
});
