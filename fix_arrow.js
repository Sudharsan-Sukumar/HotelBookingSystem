const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'features', 'User', 'Admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // They just want a small down arrow near the admin name.
  // I will replace the <i class="bi bi-chevron-down"> with a pure text arrow or make sure it's bold and clear.
  // Or maybe their CSS hides Bootstrap icons? Let me just use a unicode arrow just to be 100% safe.
  
  const oldStr = '<i class="bi bi-chevron-down text-white-50 ms-1" style="font-size: 0.8rem !important;"></i>';
  const newStr = '<span class="ms-2 text-warning" style="font-size: 0.9rem;">&#9660;</span>';
  
  if (content.includes(oldStr)) {
    content = content.replace(oldStr, newStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed arrow in ' + file);
  }
});
