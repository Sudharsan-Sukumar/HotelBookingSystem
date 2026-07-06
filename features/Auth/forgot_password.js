document.addEventListener('DOMContentLoaded', () => {
  // Elements Selection
  const form = document.getElementById('forgotPasswordForm');
  const emailInput = document.getElementById('resetEmail');
  const btnSendOTP = document.getElementById('btnSendOTP');
  const otpTimerContainer = document.getElementById('otpTimerContainer');
  const otpCountdown = document.getElementById('otpCountdown');

  const otpInput = document.getElementById('otpCode');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const showPasswordCheckbox = document.getElementById('showPassword');
  const btnResetPassword = document.getElementById('btnResetPassword');

  const emailError = document.getElementById('resetEmailError');
  const otpError = document.getElementById('otpCodeError');
  const newPasswordError = document.getElementById('newPasswordError');
  const confirmPasswordError = document.getElementById('confirmPasswordError');
  const statusAlert = document.getElementById('statusAlert');

  // Secure Mock Configuration
  let generatedOTP = null;
  let attemptsCount = 0;
  let countdownInterval = null;
  const mockRegisteredEmails = ['customer@elegantenclave.com', 'admin@elegantenclave.com', 'user@example.com'];

  // Show password toggle logic
  if (showPasswordCheckbox) {
    showPasswordCheckbox.addEventListener('change', () => {
      const type = showPasswordCheckbox.checked ? 'text' : 'password';
      newPasswordInput.type = type;
      confirmPasswordInput.type = type;
    });
  }

  // Email format validation
  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.toLowerCase().trim());
  }

  // Strong password verification rules
  function validatePasswordStrength(pwd) {
    if (pwd.length < 8 || pwd.length > 64) return false;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasDigit = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    return hasUpper && hasLower && hasDigit && hasSpecial;
  }

  // Show feedback messages
  function showAlert(msg, type = 'danger') {
    statusAlert.className = `alert alert-${type} mb-3 small py-2 px-3 text-start`;
    statusAlert.textContent = msg;
    statusAlert.classList.remove('d-none');
  }

  function hideAlert() {
    statusAlert.classList.add('d-none');
  }

  // 1. Send OTP trigger action
  btnSendOTP.addEventListener('click', () => {
    // Clear errors
    emailInput.classList.remove('is-invalid');
    emailError.textContent = '';
    hideAlert();

    const emailValue = emailInput.value.trim().toLowerCase();

    if (!emailValue) {
      emailInput.classList.add('is-invalid');
      emailError.textContent = 'Registered Email is required.';
      return;
    }

    if (!validateEmail(emailValue)) {
      emailInput.classList.add('is-invalid');
      emailError.textContent = 'Please enter a valid email address.';
      return;
    }

    // Check email registration
    if (!mockRegisteredEmails.includes(emailValue)) {
      showAlert('No account found with this email address.', 'danger');
      return;
    }

    // Generate secure 6-digit numeric OTP
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    attemptsCount = 0;
    
    // Simulate sending OTP via Alert window
    alert(`[SECURE EMAIL SIMULATION]\nTo: ${emailValue}\nSubject: Your Reset OTP Code\n\nYour 6-digit OTP verification code is: ${generatedOTP}`);

    // Enable OTP, Passwords inputs and Show Password checkboxes
    otpInput.removeAttribute('disabled');
    newPasswordInput.removeAttribute('disabled');
    confirmPasswordInput.removeAttribute('disabled');
    showPasswordCheckbox.removeAttribute('disabled');
    btnResetPassword.removeAttribute('disabled');

    // Trigger OTP Countdown Timer
    btnSendOTP.setAttribute('disabled', 'true');
    otpTimerContainer.classList.remove('d-none');
    let timeLeft = 60;
    otpCountdown.textContent = timeLeft;

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
      timeLeft--;
      otpCountdown.textContent = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        btnSendOTP.removeAttribute('disabled');
        btnSendOTP.textContent = 'Resend OTP';
        otpTimerContainer.classList.add('d-none');
      }
    }, 1000);

    showAlert('Verification OTP sent successfully to your registered email.', 'success');
  });

  // 2. Validate Reset Form fields
  function validateResetForm() {
    let isValid = true;

    // Reset error classes
    otpInput.classList.remove('is-invalid');
    newPasswordInput.classList.remove('is-invalid');
    confirmPasswordInput.classList.remove('is-invalid');
    otpError.textContent = '';
    newPasswordError.textContent = '';
    confirmPasswordError.textContent = '';
    hideAlert();

    // Verify OTP Input
    const otpValue = otpInput.value.trim();
    if (!otpValue) {
      otpInput.classList.add('is-invalid');
      otpError.textContent = 'Verification OTP is required.';
      isValid = false;
    } else if (otpValue !== generatedOTP) {
      attemptsCount++;
      otpInput.classList.add('is-invalid');
      if (attemptsCount >= 5) {
        otpInput.setAttribute('disabled', 'true');
        btnResetPassword.setAttribute('disabled', 'true');
        otpError.textContent = 'Too many attempts. Please request a new OTP.';
        showAlert('OTP Locked due to excessive incorrect attempts. Please resend a new OTP code.', 'danger');
      } else {
        otpError.textContent = `Invalid OTP. Attempts left: ${5 - attemptsCount}`;
      }
      isValid = false;
    }

    // Verify Passwords
    const newPwd = newPasswordInput.value;
    const confirmPwd = confirmPasswordInput.value;

    if (!newPwd) {
      newPasswordInput.classList.add('is-invalid');
      newPasswordError.textContent = 'New Password is required.';
      isValid = false;
    } else if (!validatePasswordStrength(newPwd)) {
      newPasswordInput.classList.add('is-invalid');
      newPasswordError.textContent = 'Password must be 8-64 characters and contain an uppercase letter, lowercase letter, number, and special character.';
      isValid = false;
    }

    if (!confirmPwd) {
      confirmPasswordInput.classList.add('is-invalid');
      confirmPasswordError.textContent = 'Please confirm your new password.';
      isValid = false;
    } else if (newPwd !== confirmPwd) {
      confirmPasswordInput.classList.add('is-invalid');
      confirmPasswordError.textContent = 'Passwords do not match.';
      isValid = false;
    }

    return isValid;
  }

  // 3. Submitting Reset Action Form
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (validateResetForm()) {
      // Invalidate simulation variables
      generatedOTP = null;

      showAlert('Password reset successfully. Redirecting you to Login...', 'success');
      
      // Store redirect state item
      sessionStorage.setItem('resetSuccessMsg', 'Password reset successfully. Please login with your new password.');

      // Disable actions during redirecting
      btnResetPassword.setAttribute('disabled', 'true');
      btnSendOTP.setAttribute('disabled', 'true');

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    }
  });
});
