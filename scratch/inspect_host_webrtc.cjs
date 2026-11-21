const fs = require('fs');

const studentHtml = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');

const idx = studentHtml.indexOf("document.getElementById('joinBtn').addEventListener");
console.log('=== joinBtn in student.html ===');
console.log(studentHtml.slice(idx, idx + 3000));
