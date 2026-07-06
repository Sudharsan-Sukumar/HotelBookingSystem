document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('editManagerForm');
  const btnReset = document.getElementById('btnResetPassword');
  const btnDeactivate = document.getElementById('btnDeactivate');
  const notesTextarea = document.getElementById('adminNotes');
  const notesCount = document.getElementById('lblNotesCount');

  function showToast(message, isSuccess = true) {
    const toastMessage = document.getElementById('toastMessage');
    const toastEl = document.getElementById('statusToast');
    toastEl.className = `toast align-items-center text-white border-0 shadow ${isSuccess ? 'bg-success' : 'bg-danger'}`;
    toastMessage.textContent = message;
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }

  // Character counter for admin notes
  notesTextarea.addEventListener('input', () => {
    const count = notesTextarea.value.length;
    notesCount.textContent = `${count} / 250 characters`;
  });

  // Password reset handler
  btnReset.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset password credentials for this manager?')) {
      showToast('Temporary password has been generated and dispatched to manager email.', true);
    }
  });

  // Deactivate handler
  btnDeactivate.addEventListener('click', () => {
    if (confirm('Deactivate Manager? The manager will lose system access immediately. Room and booking data remain unchanged.')) {
      document.getElementById('status').value = 'Inactive';
      document.getElementById('lblHeaderStatus').className = 'badge bg-secondary-light text-secondary me-2';
      document.getElementById('lblHeaderStatus').textContent = 'Inactive';
      showToast('Manager account deactivated successfully.', true);
    }
  });

  // Form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();

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

    if (isValid) {
      showToast('Manager information updated successfully.', true);
      setTimeout(() => {
        location.href = 'view_user.html?id=MGR-001';
      }, 1500);
    }
  });
});
