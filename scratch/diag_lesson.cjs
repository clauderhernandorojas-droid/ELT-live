const fs = require('fs');

function inspectHost() {
  const content = fs.readFileSync('host.html', 'utf8');
  const lines = content.split('\n');
  console.log('=== HOST BROADCAST LISTENERS ===');
  lines.forEach((l, i) => {
    if (l.includes("event: '") || l.includes('event: "')) {
      console.log(`${i + 1}: ${l.trim()}`);
    }
  });
}

function inspectStudent() {
  const content = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');
  const lines = content.split('\n');
  console.log('\n=== STUDENT BROADCAST LISTENERS ===');
  lines.forEach((l, i) => {
    if (l.includes("event: '") || l.includes('event: "')) {
      console.log(`${i + 1}: ${l.trim()}`);
    }
  });
}

inspectHost();
inspectStudent();
