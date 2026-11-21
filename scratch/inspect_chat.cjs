const fs = require('fs');
const content = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');
const idx = content.indexOf('id="leftWorkspaceColumn"');
console.log(content.slice(idx, idx + 800));
