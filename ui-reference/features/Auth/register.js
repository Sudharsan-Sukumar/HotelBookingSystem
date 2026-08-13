document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registrationForm');
  
  const firstName = document.getElementById('firstName');
  const lastName = document.getElementById('lastName');
  const dobInput = document.getElementById('registerDob');
  const emailInput = document.getElementById('registerEmail');
  const phoneInput = document.getElementById('registerPhone');
  const btnSendOtp = document.getElementById('btnSendOtp');
  const otpContainer = document.getElementById('otpContainer');
  const localOtpAlert = document.getElementById('localOtpAlert');
  const otpInput = document.getElementById('registerOtp');
  const passwordInput = document.getElementById('registerPassword');
  const confirmPasswordInput = document.getElementById('confirmRegisterPassword');
  const showPasswordCheckbox = document.getElementById('showPassword');
  const btnSubmit = document.getElementById('btnSubmitRegister');
  const agreePoliciesCheckbox = document.getElementById('agreePolicies');

  const fNameError = document.getElementById('firstNameError');
  const lNameError = document.getElementById('lastNameError');
  const dobError = document.getElementById('registerDobError');
  const emailError = document.getElementById('registerEmailError');
  const phoneError = document.getElementById('registerPhoneError');
  const otpError = document.getElementById('registerOtpError');
  const passwordError = document.getElementById('registerPasswordError');
  const confirmPasswordError = document.getElementById('confirmRegisterPasswordError');
  const agreePoliciesError = document.getElementById('agreePoliciesError');
  const statusAlert = document.getElementById('statusAlert'); 

  // Set min and max for Date of Birth
  if (dobInput) {
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split('T')[0];
    const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate()).toISOString().split('T')[0];
    dobInput.max = maxDate;
    dobInput.min = minDate;
  }

  // 1. Password Visibility Toggle
  if (showPasswordCheckbox && passwordInput && confirmPasswordInput) {
    showPasswordCheckbox.addEventListener('change', () => {
      const type = showPasswordCheckbox.checked ? 'text' : 'password';
      passwordInput.type = type;
      confirmPasswordInput.type = type;
    });
  }

  // Regexes
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[6-9]\d{9}$/;
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  function showError(input, errorElement, message) {
    input.classList.add('is-invalid');
    if (errorElement) errorElement.textContent = message;
  }

  function clearError(input, errorElement) {
    input.classList.remove('is-invalid');
    if (errorElement) errorElement.textContent = '';
  }

  function validateFirstName() {
    if (!firstName.value.trim()) {
      showError(firstName, fNameError, 'First name is required.');
      return false;
    }
    clearError(firstName, fNameError);
    return true;
  }

  function validateLastName() {
    if (!lastName.value.trim()) {
      showError(lastName, lNameError, 'Last name is required.');
      return false;
    }
    clearError(lastName, lNameError);
    return true;
  }

  function validateDob() {
    const val = dobInput.value;
    if (!val) {
      showError(dobInput, dobError, 'Date of Birth is required.');
      return false;
    }
    const dob = new Date(val);
    if (isNaN(dob.getTime())) {
      showError(dobInput, dobError, 'Please enter a valid date.');
      return false;
    }
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    
    if (age > 120) {
      showError(dobInput, dobError, 'Please enter a valid date of birth.');
      return false;
    }
    
    if (age < 18) {
      if (dob > today) {
        showError(dobInput, dobError, 'Date of birth cannot be in the future.');
      } else {
        showError(dobInput, dobError, 'You must be at least 18 years old to register.');
      }
      return false;
    }
    clearError(dobInput, dobError);
    return true;
  }

  function validateEmail() {
    const val = emailInput.value.trim();
    if (!val) {
      showError(emailInput, emailError, 'Email address is required.');
      return false;
    }
    if (!emailRegex.test(val.toLowerCase())) {
      showError(emailInput, emailError, 'Please enter a valid email address (e.g., name@example.com).');
      return false;
    }
    
    // Check if already registered
    if (typeof HotelState !== 'undefined' && HotelState.users) {
      const existingUser = HotelState.users.find(u => u.email.toLowerCase() === val.toLowerCase());
      if (existingUser) {
        showError(emailInput, emailError, 'An account with this email already exists.');
        return false;
      }
    }
    
    clearError(emailInput, emailError);
    return true;
  }

  function validatePhone() {
    const val = phoneInput.value.trim();
    if (!val) {
      showError(phoneInput, phoneError, 'Phone number is required.');
      return false;
    }
    if (!phoneRegex.test(val)) {
      showError(phoneInput, phoneError, 'Enter a valid 10-digit Indian mobile number (e.g., 9876543210).');
      return false;
    }
    clearError(phoneInput, phoneError);
    return true;
  }

  let otpSent = false;

  if (btnSendOtp) {
    btnSendOtp.addEventListener('click', () => {
      if (validatePhone()) {
        otpSent = true;
        otpContainer.classList.remove('d-none');
        btnSendOtp.textContent = 'Resend OTP';
        phoneInput.readOnly = true;
        if (localOtpAlert) {
          localOtpAlert.textContent = 'OTP sent successfully! For development, the OTP is: 123456';
          localOtpAlert.classList.remove('d-none');
        }
        checkFormValidity();
      } else {
        showAlert('Please enter a valid phone number before sending OTP.', 'danger');
      }
    });
  }

  function validateOtp() {
    if (!otpSent) return false;
    const val = otpInput.value.trim();
    if (!val) {
      showError(otpInput, otpError, 'OTP is required.');
      return false;
    }
    if (val !== '123456') {
      showError(otpInput, otpError, 'Invalid OTP.');
      return false;
    }
    clearError(otpInput, otpError);
    return true;
  }

  function validatePassword() {
    const val = passwordInput.value;
    if (!val) {
      showError(passwordInput, passwordError, 'Password is required.');
      return false;
    }
    if (!passwordRegex.test(val)) {
      showError(passwordInput, passwordError, 'Minimum 8 characters, one uppercase, one lowercase, one number, and one special character.');
      return false;
    }
    clearError(passwordInput, passwordError);
    return true;
  }

  function validateConfirmPassword() {
    const val = confirmPasswordInput.value;
    const pwdVal = passwordInput.value;
    if (!val) {
      showError(confirmPasswordInput, confirmPasswordError, 'Please confirm your password.');
      return false;
    }
    if (val !== pwdVal) {
      showError(confirmPasswordInput, confirmPasswordError, 'Passwords do not match.');
      return false;
    }
    clearError(confirmPasswordInput, confirmPasswordError);
    return true;
  }

  function validatePolicies() {
    if (!agreePoliciesCheckbox.checked) {
      if (agreePoliciesError) agreePoliciesError.textContent = 'You must accept the registration policies to continue.';
      return false;
    }
    if (agreePoliciesError) agreePoliciesError.textContent = '';
    return true;
  }

  function checkFormValidity() {
    const isFirstNameValid = firstName.value.trim() !== '';
    const isLastNameValid = lastName.value.trim() !== '';
    let isDobValid = false;
    if (dobInput.value) {
      const dob = new Date(dobInput.value);
      if (!isNaN(dob.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        isDobValid = age >= 18 && age <= 120;
      }
    }
    const isEmailValid = emailRegex.test(emailInput.value.trim().toLowerCase()) && (typeof HotelState === 'undefined' || !HotelState.users || !HotelState.users.find(u => u.email.toLowerCase() === emailInput.value.trim().toLowerCase()));
    const isPhoneValid = phoneRegex.test(phoneInput.value.trim());
    const isOtpValid = otpSent && otpInput.value.trim() === '123456';
    const isPasswordValid = passwordRegex.test(passwordInput.value);
    const isConfirmPasswordValid = confirmPasswordInput.value === passwordInput.value && confirmPasswordInput.value !== '';
    const isPoliciesValid = agreePoliciesCheckbox.checked;

    const isValid = isFirstNameValid && isLastNameValid && isDobValid && isEmailValid && isPhoneValid && isOtpValid && isPasswordValid && isConfirmPasswordValid && isPoliciesValid;

    if (btnSubmit) {
      btnSubmit.disabled = !isValid;
    }
    return isValid;
  }

  // Attach events
  const fieldValidators = [
    { field: firstName, validator: validateFirstName },
    { field: lastName, validator: validateLastName },
    { field: dobInput, validator: validateDob },
    { field: emailInput, validator: validateEmail },
    { field: phoneInput, validator: validatePhone },
    { field: otpInput, validator: validateOtp },
    { field: passwordInput, validator: validatePassword },
    { field: confirmPasswordInput, validator: validateConfirmPassword },
    { field: agreePoliciesCheckbox, validator: validatePolicies, event: 'change' }
  ];

  fieldValidators.forEach(({ field, validator, event }) => {
    if (field) {
      const evt = event || 'input';
      field.addEventListener(evt, () => {
        validator();
        checkFormValidity();
      });
      if (!event) {
        field.addEventListener('blur', () => {
          validator();
          checkFormValidity();
        });
      }
    }
  });
  
  // Re-validate confirm password if password changes
  if (passwordInput && confirmPasswordInput) {
    passwordInput.addEventListener('input', () => {
      if (confirmPasswordInput.value) {
        validateConfirmPassword();
      }
    });
  }

  // Initial check
  checkFormValidity();

  function showAlert(msg, type = 'success') {
    if(!statusAlert) return;
    statusAlert.className = `alert alert-${type} mb-3 small py-2 px-3 text-center fw-bold`;
    statusAlert.textContent = msg;
    statusAlert.classList.remove('d-none');
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // Trigger all validations to show errors if any
      const v1 = validateFirstName();
      const v2 = validateLastName();
      const vDob = validateDob();
      const v3 = validateEmail();
      const v4 = validatePhone();
      const vOtp = validateOtp();
      const v5 = validatePassword();
      const v6 = validateConfirmPassword();
      const v7 = validatePolicies();

      if (v1 && v2 && vDob && v3 && v4 && vOtp && v5 && v6 && v7) {
        if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';
        }

        setTimeout(() => {
          if (typeof HotelState !== 'undefined' && HotelState.users) {
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
              dob: dobInput.value,
              address: { street: '', city: '', state: '', pincode: '' },
              createdAt: new Date().toISOString(),
              status: 'Active',
              loyaltyPoints: 0,
              memberTier: 'Bronze',
              assignedHotelId: null
            };
            
            users.push(newUser);
            HotelState.users = users;
          }

          showAlert('Registration completed successfully.', 'success');

          // Redirect
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 2500);
        }, 800);
      }
    });
  }
});
