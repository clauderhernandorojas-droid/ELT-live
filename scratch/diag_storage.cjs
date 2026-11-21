const fs = require('fs');

const content = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');
const lines = content.split('\n');

console.log('Searching for localStorage and sessionStorage...');
lines.forEach((l, i) => {
  if (l.includes('localStorage') || l.includes('sessionStorage')) {
    console.log(`${i + 1}: ${l.trim()}`);
  }
});
