const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'Shared', 'UtilityClass', 'session.js');
let content = fs.readFileSync(file, 'utf8');

// Remove addAuditLog method
content = content.replace(/static addAuditLog\([\s\S]*?this\.auditLogs = logs;\n  }/, '');

// Remove getters and setters for auditLogs
content = content.replace(/static get auditLogs\(\) \{ return this\.get\('auditLogs', \[\]\); \}\n  static set auditLogs\(val\) \{ this\.set\('auditLogs', val\); \}\n/, '');

// Remove initial creation of auditLogs
content = content.replace(/if \(!this\.get\('auditLogs'\)\) \{\n      this\.set\('auditLogs', \[\]\);\n    \}\n/, '');

fs.writeFileSync(file, content, 'utf8');
console.log('Purged session.js');
