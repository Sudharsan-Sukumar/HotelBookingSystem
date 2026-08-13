const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'features', 'User', 'Admin');
const filesToFix = ['edit_about.html', 'edit_hotel.html', 'view_hotel.html'];

filesToFix.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace <nav class="navbar ...">...</nav>
  // using regex that matches from <nav class="navbar to </nav>
  content = content.replace(/<nav class="navbar[\s\S]*?<\/nav>/, '');
  
  // Also remove <!-- TOP NAVIGATION --> just in case
  content = content.replace(/<!-- TOP NAVIGATION -->/g, '');

  if (content.includes('<div class="container-fluid px-4 py-4"')) {
    content = content.replace(/<div class="container-fluid px-4 py-4"[^>]*>/, (match) => {
      const pageTitle = file.replace('.html', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      return `
  <!-- Main Layout Wrapper -->
<div class="d-flex" style="min-height: 100vh;">
    <!-- Sidebar Container -->
    <div id="admin-sidebar-container"></div>
    
    <!-- Main Content Area -->
    <div class="flex-grow-1 d-flex flex-column bg-light" style="min-width: 0;">
        
        <!-- Lightweight Header -->
        <header class="d-flex justify-content-between align-items-center p-3 bg-white border-bottom sticky-top shadow-sm">
            <div class="d-flex align-items-center gap-3">
                <button class="btn btn-light d-lg-none" id="mobile-sidebar-toggle"><i class="bi bi-list fs-4"></i></button>
                <h5 class="mb-0 font-serif fw-bold text-dark" id="header-page-title">${pageTitle}</h5>
            </div>
            
            <div class="d-flex align-items-center gap-3">
                <a href="notifications.html" class="position-relative text-dark p-2" style="text-decoration: none;">
                    <i class="bi bi-bell-fill fs-5 text-warning"></i>
                    <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="font-size: 0.6rem; transform: translate(-30%, -10%); border: 2px solid #ffffff;">3</span>
                </a>
            </div>
        </header>

        ${match}`;
    });

    // Close the wrapper before the footer
    if (content.includes('</body>')) {
      content = content.replace(/<\/body>/, '  </div>\n</div>\n</body>');
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed ' + file);
  } else {
    console.log('Could not find container-fluid in ' + file);
  }
});
