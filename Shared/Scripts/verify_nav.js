const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'features', 'User', 'Admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  if (content.includes('<nav class="navbar') || content.includes('ElegantEnclave')) {
    console.log('FAIL - Old nav found in: ' + file);
  }
  if (!content.includes('admin-sidebar-container')) {
    console.log('FAIL - Sidebar missing in: ' + file);
  }
});
console.log('Verification complete.');
