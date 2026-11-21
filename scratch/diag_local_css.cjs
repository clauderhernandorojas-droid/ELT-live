const fs = require('fs');

const content = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('webrtcLocal') || l.includes('LocalCard') || l.includes('webrtcLocalControls')) {
    if (i < 400 || i > 7200) {
      console.log(`${i + 1}: ${l.trim()}`);
    }
  }
});
