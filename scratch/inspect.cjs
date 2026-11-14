const fs = require('fs');

const host = fs.readFileSync('host.html', 'utf8');
const student = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');

function showMatch(label, str, re) {
  const m = str.match(re);
  console.log(`=== ${label} ===`);
  console.log(m ? m[0] : 'NOT FOUND');
}

showMatch('HOST CSS', host, /#webrtcVideoStrip\.jitsi-mode[\s\S]*?#jitsiDockContainer[\s\S]*?\}/);
showMatch('HOST BTN', host, /<button id="btnMinimizeVideoStrip"[\s\S]*?<\/button>/);
showMatch('HOST JITSI CONTAINER', host, /<div id="jitsiDockContainer"[\s\S]*?<\/div>/);

showMatch('STUDENT CSS', student, /#webrtcVideoStrip\.jitsi-mode[\s\S]*?#jitsiDockContainer[\s\S]*?\}/);
showMatch('STUDENT BTN', student, /<button id="btnMinimizeVideoStrip"[\s\S]*?<\/button>/);
showMatch('STUDENT JITSI CONTAINER', student, /<div id="jitsiDockContainer"[\s\S]*?<\/div>/);

