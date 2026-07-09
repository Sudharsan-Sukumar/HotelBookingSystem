document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registrationForm');
  
  const firstName = document.getElementById('firstName');
  const lastName = document.getElementById('lastName');
  const emailInput = document.getElementById('registerEmail');
  const phoneInput = document.getElementById('registerPhone');
  const passwordInput = document.getElementById('registerPassword');
  const confirmPasswordInput = document.getElementById('confirmRegisterPassword');
  const showPasswordCheckbox = document.getElementById('showPassword');
  const btnSubmit = document.getElementById('btnSubmitRegister');

  const fNameError = document.getElementById('firstNameError');
  const lNameError = document.getElementById('lastNameError');
  const emailError = document.getElementById('registerEmailError');
  const phoneError = document.getElementById('registerPhoneError');
  const passwordError = document.getElementById('registerPasswordError');
  const confirmPasswordError = document.getElementById('confirmRegisterPasswordError');

  const agreePoliciesCheckbox = document.getElementById('agreePolicies');
  const agreePoliciesError = document.getElementById('agreePoliciesError');

  // 1. Password Visibility Toggle
  if (showPasswordCheckbox && passwordInput && confirmPasswordInput) {
    showPasswordCheckbox.addEventListener('change', () => {
      const type = showPasswordCheckbox.checked ? 'text' : 'password';
      passwordInput.type = type;
      confirmPasswordInput.type = type;
    });
  }

  const formInputs = [firstName, lastName, emailInput, phoneInput, passwordInput, confirmPasswordInput];
  formInputs.forEach(input => {
    if (input) {
      input.addEventListener('input', () => validateFormInputs(false));
    }
  });

  if (agreePoliciesCheckbox) {
    agreePoliciesCheckbox.addEventListener('change', () => validateFormInputs(false));
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase().trim());
  }

  function validatePasswordStrength(pwd) {
    // min 8 chars, 1 uppercase, 1 number, 1 special character
    const re = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return re.test(pwd);
  }

  function validateFormInputs(showErrors = true) {
    let isValid = true;

    if (showErrors) {
      formInputs.forEach(i => i && i.classList.remove('is-invalid'));
      if(fNameError) fNameError.textContent = '';
      if(lNameError) lNameError.textContent = '';
      if(emailError) emailError.textContent = '';
      if(phoneError) phoneError.textContent = '';
      if(passwordError) passwordError.textContent = '';
      if(confirmPasswordError) confirmPasswordError.textContent = '';
      if(agreePoliciesError) agreePoliciesError.textContent = '';
    }

    if (firstName && !firstName.value.trim()) {
      if (showErrors) {
        firstName.classList.add('is-invalid');
        fNameError.textContent = 'First name is required.';
      }
      isValid = false;
    }

    if (lastName && !lastName.value.trim()) {
      if (showErrors) {
        lastName.classList.add('is-invalid');
        lNameError.textContent = 'Last name is required.';
      }
      isValid = false;
    }

    const emailVal = emailInput ? emailInput.value.trim().toLowerCase() : '';
    if (!emailVal || !validateEmail(emailVal)) {
      if (showErrors) {
        emailInput.classList.add('is-invalid');
        emailError.textContent = 'Please enter a valid email address.';
      }
      isValid = false;
    } else {
      const existingUser = HotelState.users.find(u => u.email.toLowerCase() === emailVal);
      if (existingUser) {
        if (showErrors) {
          emailInput.classList.add('is-invalid');
          emailError.textContent = 'An account with this email already exists.';
        }
        isValid = false;
      }
    }

    if (phoneInput && !phoneInput.value.trim()) {
      if (showErrors) {
        phoneInput.classList.add('is-invalid');
        phoneError.textContent = 'Phone number is required.';
      }
      isValid = false;
    }

    const pwdVal = passwordInput ? passwordInput.value : '';
    if (!pwdVal || !validatePasswordStrength(pwdVal)) {
      if (showErrors) {
        passwordInput.classList.add('is-invalid');
        passwordError.textContent = 'Password must be at least 8 characters long, contain 1 uppercase letter, 1 number, and 1 special character.';
      }
      isValid = false;
    }

    const confirmPwdVal = confirmPasswordInput ? confirmPasswordInput.value : '';
    if (!confirmPwdVal || pwdVal !== confirmPwdVal) {
      if (showErrors) {
        confirmPasswordInput.classList.add('is-invalid');
        confirmPasswordError.textContent = 'Passwords do not match.';
      }
      isValid = false;
    }

    if (agreePoliciesCheckbox && !agreePoliciesCheckbox.checked) {
      if (showErrors && agreePoliciesError) {
        agreePoliciesError.textContent = 'You must accept the registration policies to continue.';
      }
      isValid = false;
    }

    if (btnSubmit) {
      if (isValid) {
        btnSubmit.removeAttribute('disabled');
      } else {
        btnSubmit.setAttribute('disabled', 'true');
      }
    }

    return isValid;
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (validateFormInputs(true)) {
        if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        }

        setTimeout(() => {
          const users = HotelState.users;
          const newUserId = 'USR' + String(users.length + 1).padStart(3, '0');
          
          const newUser = {
            id: newUserId,
            firstName: firstName.value.trim(),
            lastName: lastName.value.trim(),
            email: emailInput.value.trim().toLowerCase(),
            password: passwordInput.value,
            role: 'Customer',
            phone: phoneInput.value.trim() || '',
            address: { street: '', city: '', state: '', pincode: '' },
            createdAt: new Date().toISOString(),
            status: 'Active',
            loyaltyPoints: 0,
            memberTier: 'Bronze',
            assignedHotelId: null
          };
          
          users.push(newUser);
          HotelState.users = users;

          // Auto login
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('userName', newUser.firstName + ' ' + newUser.lastName);
          localStorage.setItem('userRole', newUser.role);
          localStorage.setItem('userEmail', newUser.email);
          localStorage.setItem('userId', newUser.id);
          
          HotelState.set('currentUser', newUser);
          HotelState.addAuditLog(newUser.id, newUser.firstName + ' ' + newUser.lastName, newUser.role, 'USER_CREATED', 'Auth', 'User registered and logged in.');

          // Redirect
          window.location.href = '../../features/User/Candidate/my_bookings.html';
        }, 800);
      }
    });
  }
});
