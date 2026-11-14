const fs = require('fs');

function normalizeNewlines(str) {
  return str.replace(/\r\n/g, '\n');
}

// 1. Update host.html
let host = fs.readFileSync('host.html', 'utf8');
let hostIsCrlf = host.includes('\r\n');
host = normalizeNewlines(host);

const hostOldUrl = 'const iframeUrl = `https://vdo.ninja/?room=${encodeURIComponent(vdoRoom)}&push=${pushParam}&label=${labelParam}&scene&webcam&mic&quality=2&autostart&cleanoutput&nocontrols&noheader&nosettings&nochat&nofileshare&hidehome&transparent`;';
const hostNewUrl = 'const iframeUrl = `https://vdo.ninja/?room=${encodeURIComponent(vdoRoom)}&push=${pushParam}&label=${labelParam}&webcam&mic&selfview&quality=2&autostart&cleanoutput&nocontrols&noheader&nosettings&nochat&nofileshare&hidehome`;';

if (!host.includes(hostOldUrl)) {
  throw new Error('Host URL string not found');
}
host = host.replace(hostOldUrl, hostNewUrl);
if (hostIsCrlf) host = host.replace(/\n/g, '\r\n');
fs.writeFileSync('host.html', host, 'utf8');
console.log('Updated host.html');

// 2. Update ELT LIVE WEB/student.html
let student = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');
let studentIsCrlf = student.includes('\r\n');
student = normalizeNewlines(student);

const studentOldUrl = 'const iframeUrl = `https://vdo.ninja/?room=${encodeURIComponent(vdoRoom)}&push=${pushParam}&label=${labelParam}&scene&webcam&mic&quality=2&autostart&cleanoutput&nocontrols&noheader&nosettings&nochat&nofileshare&hidehome&transparent`;';
const studentNewUrl = 'const iframeUrl = `https://vdo.ninja/?room=${encodeURIComponent(vdoRoom)}&push=${pushParam}&label=${labelParam}&webcam&mic&selfview&quality=2&autostart&cleanoutput&nocontrols&noheader&nosettings&nochat&nofileshare&hidehome`;';

if (!student.includes(studentOldUrl)) {
  throw new Error('Student URL string not found');
}
student = student.replace(studentOldUrl, studentNewUrl);
if (studentIsCrlf) student = student.replace(/\n/g, '\r\n');

fs.writeFileSync('ELT LIVE WEB/student.html', student, 'utf8');
fs.writeFileSync('ELT LIVE WEB/index.html', student, 'utf8');
fs.writeFileSync('student.html', student, 'utf8');
console.log('Updated ELT LIVE WEB/student.html, ELT LIVE WEB/index.html, and student.html');

