const fs = require('fs');

const content = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');
const lines = content.split('\n');

lines.forEach((l, i) => {
  if (l.includes('zmChatDockResizeLeft') || l.includes('ResizeLeft') || l.includes('zmChatDockSlot')) {
    console.log(`${i + 1}: ${l.trim()}`);
  }
});
