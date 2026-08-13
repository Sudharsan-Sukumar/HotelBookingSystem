const fs = require('fs');
const path = require('path');

const policyJs = path.join(process.cwd(), 'Shared', 'UtilityClass', 'policy_modal.js');
let policyContent = fs.readFileSync(policyJs, 'utf8');
policyContent = policyContent.replace(/<li>All modifications are recorded for audit purposes\.<\/li>\n/, '');
fs.writeFileSync(policyJs, policyContent, 'utf8');

const indexHtml = path.join(process.cwd(), 'index.html');
let indexContent = fs.readFileSync(indexHtml, 'utf8');
indexContent = indexContent.replace(/<li>Modification history is logged for audit<\/li>\n/, '');
indexContent = indexContent.replace(/<li>An audit trail is maintained for all cancellations<\/li>\n/, '');
fs.writeFileSync(indexHtml, indexContent, 'utf8');
