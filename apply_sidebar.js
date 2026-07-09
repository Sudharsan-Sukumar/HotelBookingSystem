const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'features', 'User', 'Admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Idempotency check
  if (content.includes('id="admin-sidebar-container"')) {
    console.log('Skipping ' + file + ' (already processed)');
    return;
  }

  // Extract title to use in header
  let titleMatch = content.match(/<title>(.*?)<\/title>/);
  let pageTitle = titleMatch ? titleMatch[1].split('-')[0].trim() : 'Admin Dashboard';

  // 1. Inject CSS link in head (if not already there)
  if (!content.includes('admin-sidebar.css')) {
    content = content.replace('</head>', '  <link rel="stylesheet" href="components/admin-sidebar.css">\n</head>');
  }

  // 2. Inject JS script before </body> (if not already there)
  if (!content.includes('admin-sidebar.js')) {
    content = content.replace('</body>', '  <script src="components/admin-sidebar.js"></script>\n</body>');
  }

  // 3. Remove old TOP NAVIGATION
  content = content.replace(/<!-- TOP NAVIGATION -->[\s\S]*?<\/nav>/, '');

  // 4. Wrap content
  const mainContainerRegex = /<div class="container-fluid px-4 py-4"[^>]*>/;
  
  if (content.match(mainContainerRegex)) {
    const headerWrapper = `<!-- Main Layout Wrapper -->
<div class="d-flex" style="min-height: 100vh; overflow-x: hidden;">
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

        <div class="container-fluid px-4 py-4">`;

    content = content.replace(mainContainerRegex, headerWrapper);

    // Close the 2 wrapper divs before </body>
    content = content.replace('</body>', '  </div>\n</div>\n</body>');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Successfully refactored ' + file);
  } else {
    console.log('Main container not found in ' + file);
  }
});
