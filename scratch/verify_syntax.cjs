const fs = require('fs');
const vm = require('vm');
const path = require('path');

function checkFileScripts(filePath) {
  console.log(`Checking ${filePath}...`);
  const content = fs.readFileSync(filePath, 'utf8');
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  let idx = 0;
  while ((match = scriptRegex.exec(content)) !== null) {
    const code = match[1];
    if (!code.trim()) continue;
    idx++;
    try {
      new vm.Script(code, { filename: `${path.basename(filePath)}-script-${idx}.js` });
      console.log(`  Script #${idx}: OK (${code.length} bytes)`);
    } catch (e) {
      console.error(`  Script #${idx} Syntax Error:`, e);
      process.exit(1);
    }
  }
}

checkFileScripts('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/host.html');
checkFileScripts('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/ELT LIVE WEB/student.html');
checkFileScripts('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/ELT LIVE WEB/index.html');
checkFileScripts('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/student.html');
console.log('All scripts validated successfully!');

