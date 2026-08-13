document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgotPasswordForm');
  const emailInput = document.getElementById('resetEmail');
  const btnSendOTP = document.getElementById('btnSendOTP');
  
  const otpInput = document.getElementById('otpCode');
  const newPasswordInput = document.getElementById('newPassword');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  const showPasswordCheckbox = document.getElementById('showPassword');
  const btnResetPassword = document.getElementById('btnResetPassword');

  const emailError = document.getElementById('resetEmailError');
  const otpCodeError = document.getElementById('otpCodeError');
  const newPasswordError = document.getElementById('newPasswordError');
  const confirmPasswordError = document.getElementById('confirmPasswordError');
  const statusAlert = document.getElementById('statusAlert');

  let step = 1;
  let resetUserEmail = '';

  if (showPasswordCheckbox) {
    showPasswordCheckbox.addEventListener('change', () => {
      const type = showPasswordCheckbox.checked ? 'text' : 'password';
      newPasswordInput.type = type;
      confirmPasswordInput.type = type;
    });
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase().trim());
  }

  function validatePasswordStrength(pwd) {
    const re = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return re.test(pwd);
  }

  function showAlert(msg, type = 'danger', isHTML = false) {
    if(!statusAlert) return;
    statusAlert.className = `alert alert-${type} mb-3 small py-2 px-3 text-start`;
    if (isHTML) {
      statusAlert.innerHTML = msg;
    } else {
      statusAlert.textContent = msg;
    }
    statusAlert.classList.remove('d-none');
  }

  function hideAlert() {
    if(statusAlert) statusAlert.classList.add('d-none');
  }

  if (btnSendOTP) {
    btnSendOTP.addEventListener('click', () => {
      if (step === 1) {
        emailInput.classList.remove('is-invalid');
        if(emailError) emailError.textContent = '';
        hideAlert();

        const emailValue = emailInput.value.trim().toLowerCase();

        if (!emailValue) {
          emailInput.classList.add('is-invalid');
          if(emailError) emailError.textContent = 'Registered Email is required.';
          return;
        }

        if (!validateEmail(emailValue)) {
          emailInput.classList.add('is-invalid');
          if(emailError) emailError.textContent = 'Please enter a valid email address.';
          return;
        }

        // Dynamic validation with HotelState
        const users = HotelState.users;
        const userFound = users.find(u => u.email.toLowerCase() === emailValue);

        if (!userFound) {
          showAlert('No account found with this email address.', 'danger');
          return;
        }

        resetUserEmail = emailValue;
        showAlert('OTP sent successfully. Demo OTP: 123456', 'success');
        
        btnSendOTP.textContent = 'Verify OTP';
        step = 2;
        emailInput.setAttribute('disabled', 'true');
        if(otpInput) otpInput.removeAttribute('disabled');
      } 
      else if (step === 2) {
        otpInput.classList.remove('is-invalid');
        if(otpCodeError) otpCodeError.textContent = '';
        
        const otpValue = otpInput.value.trim();
        if (!otpValue || otpValue !== '123456') {
          otpInput.classList.add('is-invalid');
          if(otpCodeError) otpCodeError.textContent = 'Invalid OTP. Please try again.';
          showAlert('Invalid OTP. Please try again.', 'danger');
          return;
        }

        // Mark OTP as verified
        otpInput.setAttribute('disabled', 'true');
        hideAlert();

        // Hide Verify button and reveal reset inputs
        btnSendOTP.style.display = 'none';

        newPasswordInput.removeAttribute('disabled');
        confirmPasswordInput.removeAttribute('disabled');
        if(showPasswordCheckbox) showPasswordCheckbox.removeAttribute('disabled');
        btnResetPassword.removeAttribute('disabled');
        
        step = 3;
      }
    });
  }

  function validateResetForm() {
    let isValid = true;

    newPasswordInput.classList.remove('is-invalid');
    confirmPasswordInput.classList.remove('is-invalid');
    if(newPasswordError) newPasswordError.textContent = '';
    if(confirmPasswordError) confirmPasswordError.textContent = '';
    hideAlert();

    const newPwd = newPasswordInput.value;
    const confirmPwd = confirmPasswordInput.value;

    if (!newPwd) {
      newPasswordInput.classList.add('is-invalid');
      if(newPasswordError) newPasswordError.textContent = 'New Password is required.';
      isValid = false;
    } else if (!validatePasswordStrength(newPwd)) {
      newPasswordInput.classList.add('is-invalid');
      if(newPasswordError) newPasswordError.textContent = 'Password must be at least 8 characters long, contain 1 uppercase letter, 1 number, and 1 special character.';
      isValid = false;
    }

    if (!confirmPwd) {
      confirmPasswordInput.classList.add('is-invalid');
      if(confirmPasswordError) confirmPasswordError.textContent = 'Please confirm your new password.';
      isValid = false;
    } else if (newPwd !== confirmPwd) {
      confirmPasswordInput.classList.add('is-invalid');
      if(confirmPasswordError) confirmPasswordError.textContent = 'Passwords do not match.';
      isValid = false;
    }

    return isValid;
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (validateResetForm()) {
        const users = HotelState.users;
        const userIndex = users.findIndex(u => u.email.toLowerCase() === resetUserEmail);

        if (userIndex !== -1) {
          users[userIndex].password = newPasswordInput.value;
          HotelState.users = users;

          showAlert('Password reset successfully. Redirecting to login...', 'success');
          
          newPasswordInput.setAttribute('disabled', 'true');
          confirmPasswordInput.setAttribute('disabled', 'true');
          btnResetPassword.setAttribute('disabled', 'true');
          if(showPasswordCheckbox) showPasswordCheckbox.setAttribute('disabled', 'true');
          
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 3000);
          
        } else {
          showAlert('Error updating password. User not found.', 'danger');
        }
      }
    });
  }
});
