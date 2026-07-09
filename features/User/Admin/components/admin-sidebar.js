document.addEventListener("DOMContentLoaded", function () {
  // 1. Fetch and inject the sidebar HTML
  fetch('components/admin-sidebar.html')
    .then(response => {
      if (!response.ok) throw new Error("Failed to load sidebar");
      return response.text();
    })
    .then(html => {
      const container = document.getElementById('admin-sidebar-container');
      if (container) {
        container.innerHTML = html;
        
        // 2. Set the active link based on the current URL
        const currentPath = window.location.pathname;
        const pageFile = currentPath.split('/').pop() || 'dashboard.html';
        
        // Remove active class from all
        document.querySelectorAll('#adminSidebarNav .sidebar-link').forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('data-page') === pageFile) {
            link.classList.add('active');
          }
        });

        // 3. Hook up Mobile Toggle Logic
        const sidebar = document.getElementById('admin-sidebar-container');
        const overlay = document.getElementById('sidebarOverlay');
        const toggleBtn = document.getElementById('mobile-sidebar-toggle');

        function toggleSidebar() {
          sidebar.classList.toggle('show');
          overlay.classList.toggle('show');
        }

        if (toggleBtn) {
          toggleBtn.addEventListener('click', toggleSidebar);
        }

        if (overlay) {
          overlay.addEventListener('click', toggleSidebar);
        }
      }
    })
    .catch(error => {
      console.error('Error loading Admin Sidebar:', error);
    });
});
