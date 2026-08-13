const fs = require('fs');
const path = require('path');

const checkoutHtml = path.join(process.cwd(), 'features', 'User', 'Manager', 'check_out.html');
let htmlContent = fs.readFileSync(checkoutHtml, 'utf8');

// Remove Audit Status dropdown
htmlContent = htmlContent.replace(/<div class="col-md-6 mb-3">\s*<label class="form-label small fw-semibold">Audit Status<\/label>\s*<select class="form-select" id="checkoutAuditStatus">\s*<option value="Cleaning">Cleaning<\/option>\s*<option value="Available">Available<\/option>\s*<\/select>\s*<\/div>/, '');

fs.writeFileSync(checkoutHtml, htmlContent, 'utf8');

const checkoutJs = path.join(process.cwd(), 'features', 'User', 'Manager', 'bookings_checkout.js');
let jsContent = fs.readFileSync(checkoutJs, 'utf8');

// Remove checkoutAuditStatus parsing logic
jsContent = jsContent.replace(/const auditStatusSelect = document\.getElementById\('checkoutAuditStatus'\);\n      const nextRoomStatus = auditStatusSelect \? \(auditStatusSelect\.value === 'Cleaning' \? 'Housekeeping' : 'Available'\) : 'Housekeeping';/, 'const nextRoomStatus = "Housekeeping";');
jsContent = jsContent.replace(/HotelState\.addAuditLog\(\{[\s\S]*?\}\);/, '');

fs.writeFileSync(checkoutJs, jsContent, 'utf8');
