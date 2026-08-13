const userId = localStorage.getItem('userId');
const userRole = localStorage.getItem('userRole');
const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

if (!isLoggedIn || userRole !== 'Customer') {
  window.location.href = '../../../features/Auth/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('profileForm');
  if (!form) return;

  const user = HotelState.getUserById(userId);
  if (!user) {
    window.location.href = '../../../features/Auth/login.html';
    return;
  }

  // 1. Populate Avatar Initials
  const avatarEl = document.querySelector('.profile-avatar');
  if (avatarEl && user.firstName && user.lastName) {
    const initials = (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
    avatarEl.textContent = initials;
    avatarEl.style.display = 'flex';
    avatarEl.style.alignItems = 'center';
    avatarEl.style.justifyContent = 'center';
    avatarEl.style.backgroundColor = '#D4AF37';
    avatarEl.style.color = '#fff';
    avatarEl.style.fontWeight = 'bold';
    avatarEl.style.width = '40px';
    avatarEl.style.height = '40px';
    avatarEl.style.borderRadius = '50%';
  }

  // 2. Inject Display Fields
  const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const readOnlySection = document.createElement('section');
  readOnlySection.className = 'profile-card bg-white p-4 shadow-sm border rounded text-start mb-3';
  readOnlySection.innerHTML = `
    <div class="d-flex align-items-center gap-3 mb-3 border-bottom pb-3">
      <span class="badge-icon-circle"><i class="bi bi-star"></i></span>
      <h2 class="section-title m-0">Your Details</h2>
    </div>
    <div class="row g-3 mb-2 text-dark">
      <div class="col-md-4"><strong>Email:</strong><br>${user.email}</div>
      <div class="col-md-4"><strong>Loyalty Points:</strong><br>${user.loyaltyPoints}</div>
      <div class="col-md-4"><strong>Member Since:</strong><br>${joinDate}</div>
      <div class="col-md-12"><strong>Address:</strong><br>${user.address?.street || ''}, ${user.address?.city || ''}, ${user.address?.state || ''} ${user.address?.pincode || ''}</div>
    </div>
  `;
  form.insertBefore(readOnlySection, form.firstChild);

  // 3. Form Inputs
  const firstName = document.getElementById('firstName');
  const lastName = document.getElementById('lastName');
  const mobilePhone = document.getElementById('mobilePhone');
  
  const firstNameErr = document.getElementById('firstNameErr');
  const lastNameErr = document.getElementById('lastNameErr');
  const mobilePhoneErr = document.getElementById('mobilePhoneErr');

  if (firstName) firstName.value = user.firstName;
  if (lastName) lastName.value = user.lastName;
  if (mobilePhone) mobilePhone.value = user.phone;

  // Make fields uneditable initially
  [firstName, lastName, mobilePhone].forEach(el => el && el.setAttribute('disabled', 'true'));

  const btnEditProfile = document.getElementById('btnEditProfile');
  const btnSave = document.getElementById('btnSaveSettings');
  let isEditing = false;

  if (btnEditProfile && btnSave) {
    btnEditProfile.addEventListener('click', (e) => {
      if (!isEditing) {
        e.preventDefault();
        isEditing = true;
        [firstName, lastName, mobilePhone].forEach(el => el && el.removeAttribute('disabled'));
        btnEditProfile.classList.add('d-none');
        btnSave.classList.remove('d-none');
      }
    });
  }

  // 4. Change Password Section logic
  const oldPassword = document.getElementById('oldPassword');
  const newPassword = document.getElementById('newPassword');
  const newPasswordErr = document.getElementById('newPasswordErr');
  const confirmPassword = document.getElementById('confirmPassword');
  const confirmPasswordErr = document.getElementById('confirmPasswordErr');
  const btnChangePassword = document.getElementById('btnChangePassword');

  function validatePasswordStrength(pwd) {
    const re = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return re.test(pwd);
  }

  if (btnChangePassword) {
    btnChangePassword.addEventListener('click', () => {
      let valid = true;
      const oldVal = oldPassword.value;
      const newVal = newPassword.value;
      const confirmVal = confirmPassword.value;

      if (oldVal !== user.password) {
        alert('Current password is incorrect.'); // Used inline alert below instead
        valid = false;
      }
      
      if (!validatePasswordStrength(newVal)) {
        newPasswordErr.classList.remove('d-none');
        valid = false;
      } else {
        newPasswordErr.classList.add('d-none');
      }

      if (newVal !== confirmVal) {
        confirmPasswordErr.classList.remove('d-none');
        valid = false;
      } else {
        confirmPasswordErr.classList.add('d-none');
      }

      if (!valid) return;

      // Update password
      user.password = newVal;
      const users = HotelState.users;
      const idx = users.findIndex(u => u.id === userId);
      if (idx !== -1) {
        users[idx] = user;
        HotelState.users = users;
      }

      

      let alertBox = document.getElementById('pwdAlertBox');
      if (!alertBox) {
        alertBox = document.createElement('div');
        alertBox.id = 'pwdAlertBox';
        alertBox.className = 'alert alert-success mt-3';
        btnChangePassword.parentElement.appendChild(alertBox);
      }
      alertBox.textContent = 'Password changed successfully.';
      alertBox.className = 'alert alert-success mt-3';
      
      oldPassword.value = '';
      newPassword.value = '';
      confirmPassword.value = '';
    });
  }

  // 5. Submit Profile Info
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isEditing) return;

    let hasError = false;

    if (!firstName.value.trim()) {
      firstNameErr.classList.remove('d-none');
      hasError = true;
    } else {
      firstNameErr.classList.add('d-none');
    }

    if (!lastName.value.trim()) {
      lastNameErr.classList.remove('d-none');
      hasError = true;
    } else {
      lastNameErr.classList.add('d-none');
    }

    if (!mobilePhone.value.trim()) { // Simplified phone validation
      mobilePhoneErr.classList.remove('d-none');
      hasError = true;
    } else {
      mobilePhoneErr.classList.add('d-none');
    }

    if (hasError) return;

    const updatedName = `${firstName.value.trim()} ${lastName.value.trim()}`;
    
    user.firstName = firstName.value.trim();
    user.lastName = lastName.value.trim();
    user.name = updatedName;
    user.phone = mobilePhone.value.trim();

    const users = HotelState.users;
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx] = user;
      HotelState.users = users;
    }

    HotelState.currentUser = user;
    localStorage.setItem('userName', updatedName);

    

    let inlineAlert = document.getElementById('profileSuccessAlert');
    if (!inlineAlert) {
      inlineAlert = document.createElement('div');
      inlineAlert.id = 'profileSuccessAlert';
      inlineAlert.className = 'alert alert-success mb-3';
      btnSave.closest('.text-end').insertBefore(inlineAlert, btnSave.closest('.text-end').firstChild);
    }
    inlineAlert.textContent = 'Profile updated successfully.';

    const userNameEl = document.querySelector('.auth-logged-in .user-name');
    if (userNameEl) userNameEl.textContent = updatedName;
    const initials = (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase();
    if (avatarEl) avatarEl.textContent = initials;

    isEditing = false;
    [firstName, lastName, mobilePhone].forEach(el => el && el.setAttribute('disabled', 'true'));
    if (btnEditProfile && btnSave) {
      btnEditProfile.classList.remove('d-none');
      btnSave.classList.add('d-none');
    }
  });

});
