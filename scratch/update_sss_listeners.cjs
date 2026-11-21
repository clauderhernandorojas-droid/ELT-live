const fs = require('fs');

console.log('=== ACTUALIZANDO LISTENERS SCREEN_SHARE_STATE ===');

// 1. En host.html
let host = fs.readFileSync('host.html', 'utf8');
const oldHostBlock = `      channel.on('broadcast', { event: 'SCREEN_SHARE_STATE' }, ({ payload }) => {
        if (!payload) return;
        const remoteId = payload.peerId || payload.fromPeerId || payload.from;
        if (!remoteId || remoteId === webrtcMyPeerId) return;
        if (webrtcPeers[remoteId]) {
          webrtcPeers[remoteId].isSharingScreen = Boolean(payload.isSharing);
          updateRemotePeerCardMedia(remoteId);
        }
      });`;

const newHostBlock = `      channel.on('broadcast', { event: 'SCREEN_SHARE_STATE' }, ({ payload }) => {
        if (!payload) return;
        const remoteId = payload.peerId || payload.fromPeerId || payload.from;
        if (!remoteId || remoteId === webrtcMyPeerId) return;
        const cleanName = (typeof normalizeStudentPeerKey === 'function')
          ? normalizeStudentPeerKey(payload.name || payload.fromName)
          : String(payload.name || payload.fromName || '').trim().toLowerCase();
        let matched = false;
        if (webrtcPeers[remoteId]) {
          webrtcPeers[remoteId].isSharingScreen = Boolean(payload.isSharing);
          updateRemotePeerCardMedia(remoteId);
          matched = true;
        }
        if (!matched && cleanName) {
          Object.keys(webrtcPeers).forEach(pid => {
            const pClean = (typeof normalizeStudentPeerKey === 'function')
              ? normalizeStudentPeerKey(webrtcPeers[pid]?.name)
              : String(webrtcPeers[pid]?.name || '').trim().toLowerCase();
            if (pClean === cleanName) {
              webrtcPeers[pid].isSharingScreen = Boolean(payload.isSharing);
              updateRemotePeerCardMedia(pid);
              matched = true;
            }
          });
        }
        syncHostScreenShareStage();
      });`;

// Reemplazar tanto con CRLF como LF
let hostNormalized = host.replace(/\r\n/g, '\n');
let oldHostNormalized = oldHostBlock.replace(/\r\n/g, '\n');
let newHostNormalized = newHostBlock.replace(/\r\n/g, '\n');

if (hostNormalized.includes(oldHostNormalized)) {
  hostNormalized = hostNormalized.replace(oldHostNormalized, newHostNormalized);
  // Mantener CRLF si el original tenía CRLF
  host = host.includes('\r\n') ? hostNormalized.replace(/\n/g, '\r\n') : hostNormalized;
  fs.writeFileSync('host.html', host, 'utf8');
  console.log('✓ host.html: SCREEN_SHARE_STATE actualizado exitosamente');
} else {
  console.error('! host.html: oldHostBlock no encontrado');
}

// 2. En student.html
let student = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');
const oldStudentBlock = `      channel.on('broadcast', { event: 'SCREEN_SHARE_STATE' }, ({ payload }) => {
        if (!isAdmittedToClass) return;
        if (!payload) return;
        const remoteId = payload.peerId || payload.fromPeerId || payload.from;
        if (remoteId === webrtcPeerId) return;
        window.__remoteScreenSharingActive = Boolean(payload.isSharing);
        if (payload.name) window.__remoteScreenSharingName = payload.name;
        if (webrtcPeers[remoteId]) {
          webrtcPeers[remoteId].isSharingScreen = Boolean(payload.isSharing);
        }
        syncStudentRemoteScreenShareOverlay();
      });`;

const newStudentBlock = `      channel.on('broadcast', { event: 'SCREEN_SHARE_STATE' }, ({ payload }) => {
        if (!isAdmittedToClass) return;
        if (!payload) return;
        const remoteId = payload.peerId || payload.fromPeerId || payload.from;
        if (remoteId === webrtcPeerId) return;
        window.__remoteScreenSharingActive = Boolean(payload.isSharing);
        if (payload.name) window.__remoteScreenSharingName = payload.name;
        if (webrtcPeers[remoteId]) {
          webrtcPeers[remoteId].isSharingScreen = Boolean(payload.isSharing);
        }
        syncStudentRemoteScreenShareOverlay();
        if (typeof syncVideoGalleryMode === 'function') {
          syncVideoGalleryMode();
        }
      });`;

let studentNormalized = student.replace(/\r\n/g, '\n');
let oldStudentNormalized = oldStudentBlock.replace(/\r\n/g, '\n');
let newStudentNormalized = newStudentBlock.replace(/\r\n/g, '\n');

if (studentNormalized.includes(oldStudentNormalized)) {
  studentNormalized = studentNormalized.replace(oldStudentNormalized, newStudentNormalized);
  student = student.includes('\r\n') ? studentNormalized.replace(/\n/g, '\r\n') : studentNormalized;
  fs.writeFileSync('ELT LIVE WEB/student.html', student, 'utf8');
  console.log('✓ ELT LIVE WEB/student.html: SCREEN_SHARE_STATE actualizado exitosamente');
} else {
  console.error('! student.html: oldStudentBlock no encontrado');
}

// 3. Sincronizar student.html raíz y index.html
fs.writeFileSync('student.html', student, 'utf8');
fs.writeFileSync('ELT LIVE WEB/index.html', student, 'utf8');
console.log('✓ Copias sincronizadas');

// 4. Paridad SHA-256
const crypto = require('crypto');
function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}
const h1 = hashFile('ELT LIVE WEB/student.html');
const h2 = hashFile('student.html');
const h3 = hashFile('ELT LIVE WEB/index.html');

console.log('SHA-256 ELT LIVE WEB/student.html:', h1);
console.log('SHA-256 student.html:             ', h2);
console.log('SHA-256 ELT LIVE WEB/index.html:   ', h3);

if (h1 === h2 && h2 === h3) {
  console.log('✓ PARIDAD 100% CONFIRMADA EN LOS 3 ARCHIVOS');
} else {
  console.error('! ERROR DE PARIDAD EN HASHES SHA-256');
  process.exit(1);
}
