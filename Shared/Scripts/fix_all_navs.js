const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'features', 'User', 'Admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const sourceNav = fs.readFileSync(path.join(dir, 'users.html'), 'utf8');
const navRegex = /<!-- TOP NAVIGATION -->([\s\S]*?)<\/nav>/;
const navMatch = sourceNav.match(navRegex);
const newNav = navMatch[0];

files.forEach(file => {
  if (file === 'users.html') return;
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.match(navRegex)) {
    let updatedNav = newNav.replace(/class="nav-link text-white nav-users active"/, 'class="nav-link text-white nav-users"');
    
    if (file === 'dashboard.html') updatedNav = updatedNav.replace(/nav-dashboard"/, 'nav-dashboard active"');
    else if (file === 'hotels.html') updatedNav = updatedNav.replace(/nav-hotels"/, 'nav-hotels active"');
    else if (file === 'content.html') updatedNav = updatedNav.replace(/nav-content"/, 'nav-content active"');
    else if (file === 'backup.html') updatedNav = updatedNav.replace(/nav-backup"/, 'nav-backup active"');
    else if (file === 'booking_monitoring.html') updatedNav = updatedNav.replace(/nav-monitoring"/, 'nav-monitoring active"');
    else if (file === 'reports.html') updatedNav = updatedNav.replace(/nav-reports"/, 'nav-reports active"');

    content = content.replace(navRegex, updatedNav);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Synced nav for ' + file);
  }
});
