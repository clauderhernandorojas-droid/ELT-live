const fs = require('fs');

const content = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');
const lines = content.split('\n');

for (let i = 7230; i < 7350; i++) {
  if (lines[i]) console.log(`${i + 1}: ${lines[i]}`);
}
