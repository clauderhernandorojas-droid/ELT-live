const fs = require('fs');

const host = fs.readFileSync('host.html', 'utf8');
const student = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');

const mH = host.match(/<div id="jitsiDockContainer"[^>]*>/);
console.log('HOST:\n' + (mH ? mH[0] : 'null'));

const mS = student.match(/<div id="jitsiDockContainer"[^>]*>/);
console.log('STUDENT:\n' + (mS ? mS[0] : 'null'));

