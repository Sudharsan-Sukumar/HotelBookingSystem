const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'features', 'User', 'Admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const oldDropdownRegex = /<!-- User Profile Dropdown -->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/nav>/;
const newDropdownHTML = fs.readFileSync('newDropdown.html', 'utf8');

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.match(oldDropdownRegex)) {
    content = content.replace(oldDropdownRegex, newDropdownHTML);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed dropdown in ' + file);
  } else {
    console.log('No match in ' + file);
  }
});
