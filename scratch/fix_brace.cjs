const fs = require('fs');

const studentPath = 'ELT LIVE WEB/student.html';
const studentIndexPath = 'ELT LIVE WEB/index.html';
const studentRootPath = 'student.html';

let student = fs.readFileSync(studentPath, 'utf8');

const isCRLF = student.includes('\r\n');
student = student.replace(/\r\n/g, '\n');

const badChunk = `      }
    }
if (typeof syncVideoGalleryMode === 'function') {
        syncVideoGalleryMode();
      }
    }
window.setVideoStripMinimized`;

const fixedChunk = `      }
      if (typeof syncVideoGalleryMode === 'function') {
        syncVideoGalleryMode();
      }
    }
window.setVideoStripMinimized`;

if (!student.includes(badChunk)) {
  console.log('Bad chunk not found!');
  process.exit(1);
}

student = student.replace(badChunk, fixedChunk);

if (isCRLF) {
  student = student.replace(/\n/g, '\r\n');
}

fs.writeFileSync(studentPath, student, 'utf8');
fs.writeFileSync(studentIndexPath, student, 'utf8');
fs.writeFileSync(studentRootPath, student, 'utf8');
console.log('Fixed extra brace successfully!');
