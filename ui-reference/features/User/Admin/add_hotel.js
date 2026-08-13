document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  if (form) {
    const contactInput = document.getElementById('contact');
    const emailInput = document.getElementById('email');

    const contactRegex = /^[6-9]\d{9}$/;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (contactInput) {
      contactInput.addEventListener('input', () => {
        if (contactInput.value.length > 0) {
          if (contactRegex.test(contactInput.value)) {
            contactInput.classList.remove('is-invalid');
            contactInput.classList.add('is-valid');
          } else {
            contactInput.classList.remove('is-valid');
            contactInput.classList.add('is-invalid');
          }
        } else {
          contactInput.classList.remove('is-invalid', 'is-valid');
        }
      });
    }

    if (emailInput) {
      emailInput.addEventListener('input', () => {
        if (emailInput.value.length > 0) {
          if (emailRegex.test(emailInput.value)) {
            emailInput.classList.remove('is-invalid');
            emailInput.classList.add('is-valid');
          } else {
            emailInput.classList.remove('is-valid');
            emailInput.classList.add('is-invalid');
          }
        } else {
          emailInput.classList.remove('is-invalid', 'is-valid');
        }
      });
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let hasError = false;

      // Contact Number Validation
      const contactRegex = /^[6-9]\d{9}$/;
      if (contactInput && !contactRegex.test(contactInput.value)) {
        contactInput.classList.add('is-invalid');
        hasError = true;
      }

      // Email Validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailInput && !emailRegex.test(emailInput.value)) {
        emailInput.classList.add('is-invalid');
        hasError = true;
      }

      if (!form.checkValidity() || hasError) {
        // If our custom checks pass but standard required fields are empty, use default HTML5 popup
        if (!hasError) form.reportValidity();
        return;
      }

      alert('Hotel added successfully!');
      window.location.href = 'hotels.html';
    });
  }
});
