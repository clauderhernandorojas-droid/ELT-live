const fs = require('fs');

const content = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');
const lines = content.split('\n');

for (let i = 0; i < 400; i++) {
  const l = lines[i];
  if (l.includes('black') || l.includes('rgba(0, 0, 0') || l.includes('bg-[#') || l.includes('border-l') || l.includes('left-') || l.includes('left:')) {
    console.log(`${i + 1}: ${l.trim()}`);
  }
}
