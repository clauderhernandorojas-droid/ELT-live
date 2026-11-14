const fs = require('fs');

const host = fs.readFileSync('host.html', 'utf8');
const student = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');

const hIdx = host.indexOf('id="webrtcStripExpandedBody"');
console.log('HOST webrtcStripExpandedBody:\n' + host.substring(hIdx, hIdx + 500));

const sIdx = student.indexOf('id="webrtcStripExpandedBody"');
console.log('STUDENT webrtcStripExpandedBody:\n' + student.substring(sIdx, sIdx + 500));

