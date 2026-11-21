const fs = require('fs');

let host = fs.readFileSync('host.html', 'utf8');

// 1. admitWaitingStudent
const idxAdmit = host.indexOf('window.admitWaitingStudent = function(studentId) {');
const idxSend = host.indexOf('roomChannel.send({', idxAdmit);
const idxEndAdmit = host.indexOf('};', idxSend);

if (idxAdmit !== -1 && idxSend !== -1 && idxEndAdmit !== -1) {
  const admitFnBody = host.substring(idxAdmit, idxEndAdmit + 2);
  console.log('Found admit function:', admitFnBody.substring(0, 150));

  const target = 'renderStudentsDashboard();';
  const idxTarget = host.indexOf(target, idxAdmit);
  if (idxTarget !== -1 && idxTarget < idxSend) {
    const addition = '\r\n\r\n      // CREACIÓN GARANTIZADA DE TARJETA EN EL DOCK DEL HOST AL ADMITIR\r\n      if (typeof ensureRemotePeerCard === \'function\') {\r\n        const studentPeerId = st.peerId || studentId;\r\n        ensureRemotePeerCard(studentPeerId, st.name);\r\n      }';
    host = host.substring(0, idxTarget + target.length) + addition + host.substring(idxTarget + target.length);
    console.log('✓ host.html: ensureRemotePeerCard agregado en admitWaitingStudent');
  }
}

// 2. WAITING_ROOM_JOIN readmisión
const idxWRJ = host.indexOf("event: 'WAITING_ROOM_JOIN'");
if (idxWRJ !== -1) {
  const targetReAdmit = 'if (admittedStudentIds.has(sid)) {';
  const idxTRA = host.indexOf(targetReAdmit, idxWRJ);
  if (idxTRA !== -1) {
    const addition2 = '\r\n          if (typeof ensureRemotePeerCard === \'function\') {\r\n            ensureRemotePeerCard(payload.peerId || sid, sName);\r\n          }';
    host = host.substring(0, idxTRA + targetReAdmit.length) + addition2 + host.substring(idxTRA + targetReAdmit.length);
    console.log('✓ host.html: ensureRemotePeerCard agregado en readmisión WAITING_ROOM_JOIN');
  }
}

// 3. STUDENT_JOIN en host.html
const idxSJ = host.indexOf("event: 'STUDENT_JOIN'");
if (idxSJ !== -1) {
  const targetSJ = 'renderStudentsDashboard();';
  const idxTSJ = host.indexOf(targetSJ, idxSJ);
  if (idxTSJ !== -1) {
    const addition3 = '\r\n\r\n        // CREACIÓN GARANTIZADA DE TARJETA EN EL DOCK DEL HOST AL UNIRSE\r\n        if (typeof ensureRemotePeerCard === \'function\') {\r\n          const peerId = payload.peerId || payload.studentId || normalizeStudentPeerKey(stName);\r\n          ensureRemotePeerCard(peerId, stName);\r\n        }';
    host = host.substring(0, idxTSJ + targetSJ.length) + addition3 + host.substring(idxTSJ + targetSJ.length);
    console.log('✓ host.html: ensureRemotePeerCard agregado en STUDENT_JOIN');
  }
}

fs.writeFileSync('host.html', host, 'utf8');
console.log('✓ host.html guardado exitosamente');
