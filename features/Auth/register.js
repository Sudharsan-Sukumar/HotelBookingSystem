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

  // 1. Password Visibility Toggle
  if (showPasswordCheckbox && passwordInput && confirmPasswordInput) {
    showPasswordCheckbox.addEventListener('change', () => {
      const type = showPasswordCheckbox.checked ? 'text' : 'password';
      passwordInput.type = type;
      confirmPasswordInput.type = type;
    });
  }

  // Input fields validation error element pointers
  const fNameError = document.getElementById('firstNameError');
  const lNameError = document.getElementById('lastNameError');
  const emailError = document.getElementById('registerEmailError');
  const phoneError = document.getElementById('registerPhoneError');
  const passwordError = document.getElementById('registerPasswordError');
  const confirmPasswordError = document.getElementById('confirmRegisterPasswordError');

  // Database simulator configurations
  const existingEmails = ['customer@elegantenclave.com', 'admin@elegantenclave.com'];
  const existingPhones = ['9876543210', '9999988888'];

  const agreePoliciesCheckbox = document.getElementById('agreePolicies');
  const agreePoliciesError = document.getElementById('agreePoliciesError');

  // Input Listeners to Enable/Disable Register Button dynamically
  const formInputs = [firstName, lastName, emailInput, phoneInput, passwordInput, confirmPasswordInput];
  formInputs.forEach(input => {
    input.addEventListener('input', () => {
      validateFormInputs(false); // Validates silently without applying border errors during typing
    });
  });

  if (agreePoliciesCheckbox) {
    agreePoliciesCheckbox.addEventListener('change', () => {
      validateFormInputs(false);
    });
  }

  // Validation functions
  function validateName(name) {
    const re = /^[A-Za-z\s-]+$/;
    return name.trim().length >= 2 && name.trim().length <= 50 && re.test(name);
  }

  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase().trim());
  }

  function validatePhone(phone) {
    // Remove space, +91 prefix
    let cleanPhone = phone.replace(/\s+/g, '');
    if (cleanPhone.startsWith('+91')) {
      cleanPhone = cleanPhone.substring(3);
    }
    const re = /^[6-9]\d{9}$/; // Valid 10-digit Indian mobile format
    return re.test(cleanPhone) && cleanPhone.length === 10;
  }

  function validatePasswordStrength(pwd) {
    if (pwd.length < 8 || pwd.length > 64) return false;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasDigit = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    return hasUpper && hasLower && hasDigit && hasSpecial;
  }

  // Master Validator function
  function validateFormInputs(showErrors = true) {
    let isValid = true;

    // Reset error styling if showErrors is enabled
    if (showErrors) {
      formInputs.forEach(i => i.classList.remove('is-invalid'));
      fNameError.textContent = '';
      lNameError.textContent = '';
      emailError.textContent = '';
      phoneError.textContent = '';
      passwordError.textContent = '';
      confirmPasswordError.textContent = '';
    }

    // 1. First Name
    if (!firstName.value.trim() || !validateName(firstName.value)) {
      if (showErrors) {
        firstName.classList.add('is-invalid');
        fNameError.textContent = 'Please enter a valid first name.';
      }
      isValid = false;
    }

    // 2. Last Name
    if (!lastName.value.trim() || !validateName(lastName.value)) {
      if (showErrors) {
        lastName.classList.add('is-invalid');
        lNameError.textContent = 'Please enter a valid last name.';
      }
      isValid = false;
    }

    // 3. Email
    const emailVal = emailInput.value.trim().toLowerCase();
    if (!emailVal || !validateEmail(emailVal)) {
      if (showErrors) {
        emailInput.classList.add('is-invalid');
        emailError.textContent = 'Please enter a valid email address.';
      }
      isValid = false;
    } else if (existingEmails.includes(emailVal)) {
      if (showErrors) {
        emailInput.classList.add('is-invalid');
        emailError.textContent = 'An account with this email already exists.';
      }
      isValid = false;
    }

    // 4. Phone Number
    const phoneVal = phoneInput.value.replace(/\s+/g, '');
    let cleanPhone = phoneVal;
    if (cleanPhone.startsWith('+91')) {
      cleanPhone = cleanPhone.substring(3);
    }
    if (!phoneVal || !validatePhone(phoneVal)) {
      if (showErrors) {
        phoneInput.classList.add('is-invalid');
        phoneError.textContent = 'Please enter a valid 10-digit phone number.';
      }
      isValid = false;
    } else if (existingPhones.includes(cleanPhone)) {
      if (showErrors) {
        phoneInput.classList.add('is-invalid');
        phoneError.textContent = 'Phone number is already registered.';
      }
      isValid = false;
    }

    // 5. Password Strength rules
    const pwdVal = passwordInput.value;
    if (!pwdVal || !validatePasswordStrength(pwdVal)) {
      if (showErrors) {
        passwordInput.classList.add('is-invalid');
        passwordError.textContent = 'Password must be 8-64 characters and contain an uppercase letter, lowercase letter, number, and special character.';
      }
      isValid = false;
    } else if (pwdVal.includes(emailInput.value.trim()) || pwdVal.includes(firstName.value.trim())) {
      if (showErrors) {
        passwordInput.classList.add('is-invalid');
        passwordError.textContent = 'Password cannot contain your email or name.';
      }
      isValid = false;
    }

    // 6. Confirm Password matching
    const confirmPwdVal = confirmPasswordInput.value;
    if (!confirmPwdVal || pwdVal !== confirmPwdVal) {
      if (showErrors) {
        confirmPasswordInput.classList.add('is-invalid');
        confirmPasswordError.textContent = 'Passwords do not match.';
      }
      isValid = false;
    }

    // 7. Policy Agreement
    if (agreePoliciesCheckbox && !agreePoliciesCheckbox.checked) {
      if (showErrors) {
        agreePoliciesError.textContent = 'You must accept the registration policies to continue.';
      }
      isValid = false;
    } else {
      if (agreePoliciesError) agreePoliciesError.textContent = '';
    }

    // Disable/Enable Submit Button based on form validity
    if (isValid) {
      btnSubmit.removeAttribute('disabled');
    } else {
      btnSubmit.setAttribute('disabled', 'true');
    }

    return isValid;
  }

  // Form submit handler
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (validateFormInputs(true)) {
        // Securely simulate hashing and customer creation event logs
        alert(`Registration completed successfully.\nPlease login to continue.`);
        // Store success redirect state item
        sessionStorage.setItem('resetSuccessMsg', 'Registration completed successfully. Please login to continue.');
        // Redirect to login page
        window.location.href = 'login.html';
      }
    });
  }
});
