const fs = require('fs');

const content = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');
const lines = content.split('\n');

console.log('HTML of #webrtcLocalCard:');
for (let i = 550; i < 600; i++) {
  if (lines[i]) console.log(`${i + 1}: ${lines[i]}`);
}
