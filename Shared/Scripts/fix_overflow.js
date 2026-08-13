const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'features', 'User', 'Admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('<div class="d-flex" style="min-height: 100vh; overflow-x: hidden;">')) {
    content = content.replace('<div class="d-flex" style="min-height: 100vh; overflow-x: hidden;">', '<div class="d-flex" style="min-height: 100vh;">');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed ' + file);
  }
});
