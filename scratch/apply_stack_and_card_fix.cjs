const fs = require('fs');

console.log('=== APLICANDO CORRECCIÓN DE RECURSIÓN Y TARJETAS GARANTIZADAS ===');

// 1. CORRECCIONES EN HOST.HTML
let host = fs.readFileSync('host.html', 'utf8');

// 1.1 En admitWaitingStudent, asegurar tarjeta inmediata del alumno en el dock del Host
const oldAdmit = `      if (!studentsState[st.name]) {
        studentsState[st.name] = { joined: true, slide: currentSlide, answers: [], slideHistory: {}, officialScoreHistory: {} };
      }
      renderStudentsDashboard();

      roomChannel.send({
        type: 'broadcast',
        event: 'WAITING_ROOM_ADMIT',
        payload: {
          studentId: studentId,
          studentName: st.name,
          videoMode: currentVideoMode,
          videoEngine: currentVideoMode,
          roomPin: roomPin
        }
      });`;

const newAdmit = `      if (!studentsState[st.name]) {
        studentsState[st.name] = { joined: true, slide: currentSlide, answers: [], slideHistory: {}, officialScoreHistory: {} };
      }
      renderStudentsDashboard();

      // CREACIÓN GARANTIZADA DE TARJETA EN EL DOCK DEL HOST AL ADMITIR
      if (typeof ensureRemotePeerCard === 'function') {
        const studentPeerId = st.peerId || studentId;
        ensureRemotePeerCard(studentPeerId, st.name);
      }

      roomChannel.send({
        type: 'broadcast',
        event: 'WAITING_ROOM_ADMIT',
        payload: {
          studentId: studentId,
          studentName: st.name,
          peerId: st.peerId || studentId,
          videoMode: currentVideoMode,
          videoEngine: currentVideoMode,
          roomPin: roomPin
        }
      });`;

if (host.includes(oldAdmit)) {
  host = host.replace(oldAdmit, newAdmit);
  console.log('✓ host.html: ensureRemotePeerCard agregado en admitWaitingStudent');
} else {
  console.log('! host.html: oldAdmit no encontrado');
}

// 1.2 En readmisión automática en WAITING_ROOM_JOIN
const oldReAdmit = `        if (admittedStudentIds.has(sid)) {
          roomChannel.send({
            type: 'broadcast',
            event: 'WAITING_ROOM_ADMIT',
            payload: { studentId: sid, studentName: sName }
          });
          return;
        }`;

const newReAdmit = `        if (admittedStudentIds.has(sid)) {
          if (typeof ensureRemotePeerCard === 'function') {
            ensureRemotePeerCard(payload.peerId || sid, sName);
          }
          roomChannel.send({
            type: 'broadcast',
            event: 'WAITING_ROOM_ADMIT',
            payload: { studentId: sid, studentName: sName, peerId: payload.peerId || sid, videoMode: currentVideoMode }
          });
          return;
        }`;

if (host.includes(oldReAdmit)) {
  host = host.replace(oldReAdmit, newReAdmit);
  console.log('✓ host.html: ensureRemotePeerCard agregado en readmisión automática');
}

// 1.3 En STUDENT_JOIN en host.html
const oldHostStudentJoin = `      roomChannel.on('broadcast', { event: 'STUDENT_JOIN' }, ({ payload }) => {
        if (!payload || !payload.studentName) return;
        const stName = payload.studentName;
        if (payload.studentId && waitingRoomStudents[payload.studentId]) {
          delete waitingRoomStudents[payload.studentId];
          renderHostWaitingRoom();
        }
        if (!studentsState[stName]) {
          studentsState[stName] = { joined: true, slide: currentSlide, answers: [], slideHistory: {}, officialScoreHistory: {} };
        }
        renderStudentsDashboard();
      });`;

const newHostStudentJoin = `      roomChannel.on('broadcast', { event: 'STUDENT_JOIN' }, ({ payload }) => {
        if (!payload || !payload.studentName) return;
        const stName = payload.studentName;
        if (payload.studentId && waitingRoomStudents[payload.studentId]) {
          delete waitingRoomStudents[payload.studentId];
          renderHostWaitingRoom();
        }
        if (!studentsState[stName]) {
          studentsState[stName] = { joined: true, slide: currentSlide, answers: [], slideHistory: {}, officialScoreHistory: {} };
        }
        renderStudentsDashboard();

        // CREACIÓN GARANTIZADA DE TARJETA EN EL DOCK DEL HOST AL UNIRSE
        if (typeof ensureRemotePeerCard === 'function') {
          const peerId = payload.peerId || payload.studentId || normalizeStudentPeerKey(stName);
          ensureRemotePeerCard(peerId, stName);
        }
      });`;

if (host.includes(oldHostStudentJoin)) {
  host = host.replace(oldHostStudentJoin, newHostStudentJoin);
  console.log('✓ host.html: ensureRemotePeerCard agregado en STUDENT_JOIN');
}

fs.writeFileSync('host.html', host, 'utf8');
console.log('✓ host.html guardado exitosamente');


// 2. CORRECCIONES EN ELT LIVE WEB/student.html
let student = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');

// 2.1 Romper recursión en syncVideoGalleryMode() y updateMinimizedVideoStripSummary()
const oldSyncGalleryStart = `    function syncVideoGalleryMode() {
      const strip = document.getElementById('webrtcVideoStrip');`;

const newSyncGalleryStart = `    let __isSyncingGallery = false;
    function syncVideoGalleryMode() {
      if (__isSyncingGallery) return;
      __isSyncingGallery = true;
      try {
        _syncVideoGalleryModeInternal();
      } finally {
        __isSyncingGallery = false;
      }
    }

    function _syncVideoGalleryModeInternal() {
      const strip = document.getElementById('webrtcVideoStrip');`;

if (student.includes(oldSyncGalleryStart)) {
  student = student.replace(oldSyncGalleryStart, newSyncGalleryStart);
  console.log('✓ student.html: Bandera __isSyncingGallery agregada a syncVideoGalleryMode');
} else {
  console.log('! student.html: oldSyncGalleryStart no encontrado');
}

// Eliminar ensureRemoteVideoCard de adentro de syncVideoGalleryMode
const oldEnsureInSync = `        // Asegurar que exista la tarjeta del Profesor (Host) en #webrtcRemoteCards con avatar "P"
        if (typeof ensureRemoteVideoCard === 'function') {
          const hostPeerId = (window.__studentLatestPeerByKey && window.__studentLatestPeerByKey['__host__']) || 'host_presence';
          ensureRemoteVideoCard(hostPeerId, 'Profesor (Host)', 'host');
        }`;

if (student.includes(oldEnsureInSync)) {
  student = student.replace(oldEnsureInSync, '// Tarjeta del Host gestionada limpiamente fuera del bucle de layout');
  console.log('✓ student.html: ensureRemoteVideoCard eliminado de syncVideoGalleryMode');
} else {
  console.log('! student.html: oldEnsureInSync no encontrado');
}

// Eliminar syncVideoGalleryMode de adentro de updateMinimizedVideoStripSummary
const oldSyncInUpdateMin = `      if (typeof syncVideoGalleryMode === 'function') {
        syncVideoGalleryMode();
      }
    }
window.setVideoStripMinimized`;

const newSyncInUpdateMin = `    }
window.setVideoStripMinimized`;

if (student.includes(oldSyncInUpdateMin)) {
  student = student.replace(oldSyncInUpdateMin, newSyncInUpdateMin);
  console.log('✓ student.html: syncVideoGalleryMode eliminado de updateMinimizedVideoStripSummary');
} else {
  // intentar con saltos de línea genéricos
  const oldChunk = `      if (typeof syncVideoGalleryMode === 'function') {
        syncVideoGalleryMode();
      }
    }`;
  const idxChunk = student.indexOf(oldChunk);
  if (idxChunk !== -1) {
    student = student.substring(0, idxChunk) + '    }' + student.substring(idxChunk + oldChunk.length);
    console.log('✓ student.html: syncVideoGalleryMode eliminado de updateMinimizedVideoStripSummary (chunk)');
  }
}

// 2.2 En WAITING_ROOM_ADMIT en student.html: asegurar tarjeta de compañeros
const oldStudentAdmitPeer = `        } else {
          // Si ya estamos admitidos y entra un nuevo compañero en modo P2P, anunciar presencia tras un breve lapso
          if (targetName && targetName !== currentName && currentVideoMode === 'p2p') {
            setTimeout(() => {
              if (typeof announceWebRTCPresence === 'function') {
                announceWebRTCPresence();
              }
            }, 600);
          }
        }`;

const newStudentAdmitPeer = `        } else {
          // Si ya estamos admitidos y entra un nuevo compañero, asegurar su tarjeta de inmediato
          if (targetName && targetName !== currentName) {
            const peerId = payload.peerId || targetId || (typeof normalizeStudentPeerKey === 'function' ? normalizeStudentPeerKey(payload.studentName) : targetName);
            if (peerId && typeof ensureRemoteVideoCard === 'function') {
              ensureRemoteVideoCard(peerId, payload.studentName || 'Compañero', 'student');
            }
            if (currentVideoMode === 'p2p') {
              setTimeout(() => {
                if (typeof announceWebRTCPresence === 'function') {
                  announceWebRTCPresence();
                }
              }, 600);
            }
          }
        }`;

if (student.includes(oldStudentAdmitPeer)) {
  student = student.replace(oldStudentAdmitPeer, newStudentAdmitPeer);
  console.log('✓ student.html: ensureRemoteVideoCard agregado en WAITING_ROOM_ADMIT');
}

// 2.3 Estilos de tarjeta local móvil sin franja gris
const oldLocalCardCss1 = `      #webrtcLocalCard {
        min-width: 144px !important;
        min-height: 86px !important;
      }`;
const newLocalCardCss1 = `      #webrtcVideoStrip:not(.gallery-mode) #webrtcLocalCard {
        min-width: 144px !important;
        min-height: 86px !important;
      }`;
if (student.includes(oldLocalCardCss1)) {
  student = student.replace(oldLocalCardCss1, newLocalCardCss1);
  console.log('✓ student.html: min-width de #webrtcLocalCard restringido a vista flotante');
}

const oldLocalCardCss2 = `      #webrtcLocalCard {
        min-width: 120px !important;
        width: 120px !important;
        height: 72px !important;
        min-height: 72px !important;
      }`;
const newLocalCardCss2 = `      #webrtcVideoStrip:not(.gallery-mode) #webrtcLocalCard {
        min-width: 120px !important;
        width: 120px !important;
        height: 72px !important;
        min-height: 72px !important;
      }`;
if (student.includes(oldLocalCardCss2)) {
  student = student.replace(oldLocalCardCss2, newLocalCardCss2);
  console.log('✓ student.html: landscape min-width de #webrtcLocalCard restringido a vista flotante');
}

// Asegurar reglas CSS de video hidden y placeholder absoluto para eliminar franja gris
const oldPlaceholderRule = `    #webrtcVideoStrip.gallery-mode #webrtcLocalPlaceholder,
    #webrtcVideoStrip.gallery-mode [data-role="placeholder"] {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      background-color: #111317 !important;
    }`;

const newPlaceholderRule = `    #webrtcLocalPlaceholder,
    #webrtcVideoStrip.gallery-mode #webrtcLocalPlaceholder,
    #webrtcVideoStrip.gallery-mode [data-role="placeholder"] {
      position: absolute !important;
      inset: 0 !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      background-color: #111317 !important;
    }
    #webrtcLocalVideo.hidden,
    #webrtcVideoStrip.gallery-mode #webrtcLocalVideo.hidden {
      display: none !important;
    }`;

if (student.includes(oldPlaceholderRule)) {
  student = student.replace(oldPlaceholderRule, newPlaceholderRule);
  console.log('✓ student.html: Reglas CSS de placeholder y video hidden reforzadas');
}

// En el DOM de student.html, asegurar que #webrtcLocalPlaceholder tenga absolute inset-0
const oldDomPlaceholder = '<div id="webrtcLocalPlaceholder" class="flex flex-col items-center justify-center text-slate-400">';
const newDomPlaceholder = '<div id="webrtcLocalPlaceholder" class="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-slate-400">';
if (student.includes(oldDomPlaceholder)) {
  student = student.replace(oldDomPlaceholder, newDomPlaceholder);
  console.log('✓ student.html: #webrtcLocalPlaceholder DOM fijado con absolute inset-0');
}

fs.writeFileSync('ELT LIVE WEB/student.html', student, 'utf8');
console.log('✓ ELT LIVE WEB/student.html guardado exitosamente');

// 3. SINCRONIZAR COPIAS IDÉNTICAS HACIA student.html RAÍZ Y ELT LIVE WEB/index.html
fs.writeFileSync('student.html', student, 'utf8');
fs.writeFileSync('ELT LIVE WEB/index.html', student, 'utf8');
console.log('✓ Copias sincronizadas en student.html raíz y ELT LIVE WEB/index.html');

// 4. VERIFICAR SHA-256
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
}
