const fs = require('fs');
const content = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');

const idx = content.indexOf('handleStudentRemoteTrackSubscribed');
console.log(content.slice(idx + 1000, idx + 2500));
