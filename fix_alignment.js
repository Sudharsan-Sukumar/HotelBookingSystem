const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'features', 'User', 'Admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const newNav = fs.readFileSync('nav_template.html', 'utf8');

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const navRegex = /<!-- TOP NAVIGATION -->([\s\S]*?)<\/nav>/;
  
  if (content.match(navRegex)) {
    let updatedNav = newNav;
    
    // Inject active state based on file
    if (file === 'dashboard.html') updatedNav = updatedNav.replace(/nav-dashboard"/, 'nav-dashboard active"');
    else if (file === 'users.html') updatedNav = updatedNav.replace(/nav-users"/, 'nav-users active"');
    else if (file === 'hotels.html') updatedNav = updatedNav.replace(/nav-hotels"/, 'nav-hotels active"');
    else if (file === 'content.html') updatedNav = updatedNav.replace(/nav-content"/, 'nav-content active"');
    else if (file === 'backup.html') updatedNav = updatedNav.replace(/nav-backup"/, 'nav-backup active"');
    else if (file === 'booking_monitoring.html') updatedNav = updatedNav.replace(/nav-monitoring"/, 'nav-monitoring active"');
    else if (file === 'reports.html') updatedNav = updatedNav.replace(/nav-reports"/, 'nav-reports active"');

    content = content.replace(navRegex, updatedNav);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed alignment in ' + file);
  }
});
