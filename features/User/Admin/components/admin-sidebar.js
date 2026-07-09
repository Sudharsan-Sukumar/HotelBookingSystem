document.addEventListener("DOMContentLoaded", function () {
  fetch('components/admin-sidebar.html')
    .then(response => {
      if (!response.ok) throw new Error("Failed to load sidebar");
      return response.text();
    })
    .then(html => {
      const container = document.getElementById('admin-sidebar-container');
      if (container) {
        container.innerHTML = html;
        
        // 1. Set Active Link based on current URL
        const currentPath = window.location.pathname;
        const pageFile = currentPath.split('/').pop() || 'dashboard.html';
        
        document.querySelectorAll('#adminSidebarNav .sidebar-link').forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('data-page') === pageFile) {
            link.classList.add('active');
          }
        });

        // 2. State Persistence Logic
        const sidebarState = localStorage.getItem('adminSidebarState') || 'collapsed';
        const isMobile = window.innerWidth < 992;
        
        if (!isMobile) {
          // Desktop: apply stored state
          if (sidebarState === 'collapsed') {
            container.classList.add('collapsed');
          } else {
            container.classList.remove('collapsed');
          }
        } else {
          // Mobile: always off-canvas (hidden/collapsed) on load
          container.classList.add('collapsed');
        }

        // 3. Toggle Button Logic
        const overlay = document.getElementById('sidebarOverlay');
        const toggleBtn = document.getElementById('mobile-sidebar-toggle');

        function toggleSidebar() {
          const isMobileNow = window.innerWidth < 992;
          if (isMobileNow) {
            container.classList.toggle('show');
            if (overlay) overlay.classList.toggle('show');
          } else {
            container.classList.toggle('collapsed');
            const isCollapsed = container.classList.contains('collapsed');
            localStorage.setItem('adminSidebarState', isCollapsed ? 'collapsed' : 'expanded');
          }
        }

        if (toggleBtn) {
          toggleBtn.addEventListener('click', toggleSidebar);
        }

        if (overlay) {
          overlay.addEventListener('click', toggleSidebar);
        }

        // 4. Auto-collapse on navigation
        document.querySelectorAll('#adminSidebarNav .sidebar-link').forEach(link => {
          link.addEventListener('click', function(e) {
            const isMobileNow = window.innerWidth < 992;
            
            // On desktop, force collapsed state for the next page load
            if (!isMobileNow) {
              localStorage.setItem('adminSidebarState', 'collapsed');
            } else {
              // On mobile, immediately close the drawer for smooth UX before page unloads
              container.classList.remove('show');
              if (overlay) overlay.classList.remove('show');
            }
          });
        });
      }
    })
    .catch(error => console.error('Error loading Admin Sidebar:', error));
});
