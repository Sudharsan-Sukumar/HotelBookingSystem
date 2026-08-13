const fs = require('fs');
const path = require('path');

const checkinJs = path.join(process.cwd(), 'features', 'User', 'Manager', 'bookings_checkin.js');
let content = fs.readFileSync(checkinJs, 'utf8');
content = content.replace(/const audit = \{[\s\S]*?\};\n/g, '');
fs.writeFileSync(checkinJs, content, 'utf8');

// Also delete fix_dashboard.js
const fixDbJs = path.join(process.cwd(), 'features', 'User', 'Admin', 'fix_dashboard.js');
if (fs.existsSync(fixDbJs)) {
  fs.unlinkSync(fixDbJs);
}
