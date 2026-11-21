const fs = require('fs');

const content = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('webrtcAudioEnabled') || l.includes('webrtcVideoEnabled')) {
    console.log(`${i + 1}: ${l.trim()}`);
  }
});
