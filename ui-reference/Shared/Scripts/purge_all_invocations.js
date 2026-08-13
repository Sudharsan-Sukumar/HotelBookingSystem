const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir(path.join(process.cwd(), 'features'), function(filePath) {
  if (filePath.endsWith('.js') || filePath.endsWith('.html')) {
    let original = fs.readFileSync(filePath, 'utf8');
    let content = original;
    
    // Split by lines and remove lines containing addAuditLog
    // Often it is multiline, so regex is better.
    // Replace HotelState.addAuditLog( ... );
    content = content.replace(/HotelState\.addAuditLog\([\s\S]*?\);/g, '');
    
    // Replace comments like // Add audit log or // Audit Log or // Audit
    content = content.replace(/\/\/ *Add audit log/gi, '');
    content = content.replace(/\/\/ *Audit Log/gi, '');
    content = content.replace(/\/\/ *Audit/gi, '');
    content = content.replace(/\/\/ *e\. Add audit log/gi, '');
    content = content.replace(/\/\/ *4\. Add audit log/gi, '');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Purged in ' + filePath);
    }
  }
});
