const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'Shared', 'UtilityClass', 'state.js');
let content = fs.readFileSync(file, 'utf8');

// Remove mock data block
content = content.replace(/if \(!this\.get\('auditLogs'\) \|\| this\.get\('auditLogs'\)\.length === 0\) \{\n[\s\S]*?this\.set\('auditLogs', logs\);\n        \}\n/g, '');

// Remove getters and setters
content = content.replace(/static get auditLogs\(\) \{ return this\.get\('auditLogs', \[\]\); \}\n    static set auditLogs\(val\) \{ this\.set\('auditLogs', val\); \}\n/g, '');

// Remove addAuditLog method
content = content.replace(/\/\/ Add an audit log entry\n    static addAuditLog\([\s\S]*?this\.auditLogs = logs;\n    }\n/g, '');

fs.writeFileSync(file, content, 'utf8');
console.log('Purged state.js');
