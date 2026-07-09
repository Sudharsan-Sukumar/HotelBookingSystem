document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Basic validation check (assuming HTML5 required attributes are in place)
      const isValid = form.checkValidity();
      if (!isValid) {
        form.reportValidity();
        return;
      }

      alert('Hotel added successfully!');
      window.location.href = 'hotels.html';
    });
  }
});
