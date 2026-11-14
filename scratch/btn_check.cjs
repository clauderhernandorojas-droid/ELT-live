const fs = require('fs');

const host = fs.readFileSync('host.html', 'utf8');
const student = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');

const mH = host.match(/<button id="btnMinimizeVideoStrip"[\s\S]*?<\/button>/);
console.log('HOST BUTTON:\n' + (mH ? mH[0] : 'null'));

const mS = student.match(/<button id="btnMinimizeVideoStrip"[\s\S]*?<\/button>/);
console.log('STUDENT BUTTON:\n' + (mS ? mS[0] : 'null'));

