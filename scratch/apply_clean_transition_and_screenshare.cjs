const fs = require('fs');

console.log('=== APLICANDO PLAN QUIRÚRGICO DE TRANSICIÓN LIMPIA Y PANTALLA COMPARTIDA ===');

// =========================================================================
// 1. MODIFICAR HOST.HTML
// =========================================================================
let host = fs.readFileSync('host.html', 'utf8');

// 1.1 Limpieza completa al cambiar de motor en startHostVideoEngine
const oldHostEngine = `    async function startHostVideoEngine(mode) {
      const targetMode = (mode === 'livekit') ? 'livekit' : 'p2p';
      currentVideoMode = targetMode;
      console.log('[ELT Live] Inicializando motor de video Host:', targetMode);

      const localCard = document.getElementById('webrtcLocalCard');
      const remoteCards = document.getElementById('webrtcRemoteCards');
      if (localCard) localCard.classList.remove('hidden');
      if (remoteCards) remoteCards.classList.remove('hidden');

      if (targetMode === 'livekit') {
        if (roomPin) {
          await connectLiveKit(roomPin, 'Profesor (Host)', true);
        }
      } else {
        // Modo Gratis WebRTC Nativo (P2P)
        if (livekitRoom) {
          try { await livekitRoom.disconnect(); } catch (e) {}
          livekitRoom = null;
        }
        if (typeof announceWebRTCPresence === 'function') {
          announceWebRTCPresence();
        }
      }
      updateLocalMediaButtonsUI();
    }`;

const newHostEngine = `    async function startHostVideoEngine(mode) {
      const targetMode = (mode === 'livekit') ? 'livekit' : 'p2p';
      currentVideoMode = targetMode;
      console.log('[ELT Live] Inicializando motor de video Host:', targetMode);

      const localCard = document.getElementById('webrtcLocalCard');
      const remoteCards = document.getElementById('webrtcRemoteCards');
      if (localCard) localCard.classList.remove('hidden');
      if (remoteCards) {
        remoteCards.classList.remove('hidden');
        remoteCards.innerHTML = '';
      }

      if (targetMode === 'livekit') {
        // Liberar hardware de cámara/micrófono y cerrar conexiones P2P previas
        if (p2pLocalStream) {
          try { p2pLocalStream.getTracks().forEach(t => t.stop()); } catch (e) {}
          p2pLocalStream = null;
        }
        closeAllP2PConnections();
        if (roomPin) {
          await connectLiveKit(roomPin, 'Profesor (Host)', true);
        }
      } else {
        // Modo Gratis WebRTC Nativo (P2P)
        if (livekitRoom) {
          try { await livekitRoom.disconnect(); } catch (e) {}
          livekitRoom = null;
        }
        closeAllP2PConnections();
        if (typeof announceWebRTCPresence === 'function') {
          announceWebRTCPresence();
        }
      }
      updateLocalMediaButtonsUI();
    }`;

if (host.includes(oldHostEngine)) {
  host = host.replace(oldHostEngine, newHostEngine);
  console.log('✓ host.html: startHostVideoEngine conmutación limpia implementada');
} else {
  console.log('! host.html: oldHostEngine no encontrado con coincidencia exacta, intentando normalizado');
  const idxH = host.indexOf('async function startHostVideoEngine(mode) {');
  const idxHEnd = host.indexOf('updateLocalMediaButtonsUI();\r\n    }', idxH) !== -1
    ? host.indexOf('updateLocalMediaButtonsUI();\r\n    }', idxH) + 'updateLocalMediaButtonsUI();\r\n    }'.length
    : host.indexOf('updateLocalMediaButtonsUI();\n    }', idxH) + 'updateLocalMediaButtonsUI();\n    }'.length;
  if (idxH !== -1 && idxHEnd > idxH) {
    host = host.substring(0, idxH) + newHostEngine + host.substring(idxHEnd);
    console.log('✓ host.html: startHostVideoEngine reemplazado por rango');
  }
}

// 1.2 Mejorar listener de SCREEN_SHARE_STATE en host.html
const idxHostSSS = host.indexOf("event: 'SCREEN_SHARE_STATE'");
if (idxHostSSS !== -1) {
  const startHandler = host.lastIndexOf("channel.on('broadcast', { event: 'SCREEN_SHARE_STATE' }", idxHostSSS);
  const endHandler = host.indexOf("});", idxHostSSS) + 3;
  if (startHandler !== -1 && endHandler > startHandler) {
    const newHostSSS = `channel.on('broadcast', { event: 'SCREEN_SHARE_STATE' }, ({ payload }) => {
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
    host = host.substring(0, startHandler) + newHostSSS + host.substring(endHandler);
    console.log('✓ host.html: listener SCREEN_SHARE_STATE robustecido con búsqueda por nombre y syncHostScreenShareStage()');
  }
}

fs.writeFileSync('host.html', host, 'utf8');
console.log('✓ host.html guardado');


// =========================================================================
// 2. MODIFICAR ELT LIVE WEB/student.html
// =========================================================================
let student = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');

// 2.1 Conmutación limpia de motor en startStudentVideoEngine (student.html)
const oldStudentEngine = `    async function startStudentVideoEngine(mode) {
      const targetMode = (mode === 'livekit') ? 'livekit' : 'p2p';
      assignedVideoMode = targetMode;
      currentVideoMode = targetMode;

      // PROHIBIDO iniciar motor de video mientras el estudiante esté en Sala de Espera
      if (!isAdmittedToClass) {
        console.log('[ELT Live] Modo de video configurado a', targetMode, '— retenido en Sala de Espera hasta aprobación del profesor.');
        return;
      }

      console.log('[ELT Live] Inicializando motor de video Estudiante:', targetMode, '(Admitido:', isAdmittedToClass, ')');

      const localCard = document.getElementById('webrtcLocalCard');
      const remoteCards = document.getElementById('webrtcRemoteCards');
      if (localCard) localCard.classList.remove('hidden');
      if (remoteCards) remoteCards.classList.remove('hidden');

      if (targetMode === 'livekit') {
        if (currentRoomPin) {
          await connectLiveKit(currentRoomPin, myName || 'Alumno', false);
        }
      } else {
        // Modo Gratis WebRTC Nativo (P2P)
        if (livekitRoom) {
          try { await livekitRoom.disconnect(); } catch (e) {}
          livekitRoom = null;
        }
        if (typeof announceWebRTCPresence === 'function') {
          announceWebRTCPresence();
        }
      }
      updateLocalMediaUI();
    }`;

const newStudentEngine = `    async function startStudentVideoEngine(mode) {
      const targetMode = (mode === 'livekit') ? 'livekit' : 'p2p';
      assignedVideoMode = targetMode;
      currentVideoMode = targetMode;

      // PROHIBIDO iniciar motor de video mientras el estudiante esté en Sala de Espera
      if (!isAdmittedToClass) {
        console.log('[ELT Live] Modo de video configurado a', targetMode, '— retenido en Sala de Espera hasta aprobación del profesor.');
        return;
      }

      console.log('[ELT Live] Inicializando motor de video Estudiante:', targetMode, '(Admitido:', isAdmittedToClass, ')');

      const localCard = document.getElementById('webrtcLocalCard');
      const remoteCards = document.getElementById('webrtcRemoteCards');
      if (localCard) localCard.classList.remove('hidden');
      if (remoteCards) {
        remoteCards.classList.remove('hidden');
        remoteCards.innerHTML = '';
      }

      if (targetMode === 'livekit') {
        // Liberar hardware de cámara/micrófono de P2P para que el SDK de LiveKit pueda abrir la cámara en Android sin error
        if (p2pLocalStream) {
          try { p2pLocalStream.getTracks().forEach(t => t.stop()); } catch (e) {}
          p2pLocalStream = null;
        }
        if (typeof closeAllP2PConnections === 'function') {
          closeAllP2PConnections();
        }
        if (currentRoomPin) {
          await connectLiveKit(currentRoomPin, myName || 'Alumno', false);
        }
      } else {
        // Modo Gratis WebRTC Nativo (P2P)
        if (livekitRoom) {
          try { await livekitRoom.disconnect(); } catch (e) {}
          livekitRoom = null;
        }
        if (typeof closeAllP2PConnections === 'function') {
          closeAllP2PConnections();
        }
        if (typeof announceWebRTCPresence === 'function') {
          announceWebRTCPresence();
        }
      }
      updateLocalMediaUI();
      if (typeof syncVideoGalleryMode === 'function') {
        syncVideoGalleryMode();
      }
    }`;

if (student.includes(oldStudentEngine)) {
  student = student.replace(oldStudentEngine, newStudentEngine);
  console.log('✓ student.html: startStudentVideoEngine conmutación limpia implementada');
} else {
  console.log('! student.html: oldStudentEngine no encontrado con coincidencia exacta, intentando normalizado');
  const idxS = student.indexOf('async function startStudentVideoEngine(mode) {');
  const idxSEnd = student.indexOf('updateLocalMediaUI();\r\n    }', idxS) !== -1
    ? student.indexOf('updateLocalMediaUI();\r\n    }', idxS) + 'updateLocalMediaUI();\r\n    }'.length
    : student.indexOf('updateLocalMediaUI();\n    }', idxS) + 'updateLocalMediaUI();\n    }'.length;
  if (idxS !== -1 && idxSEnd > idxS) {
    student = student.substring(0, idxS) + newStudentEngine + student.substring(idxSEnd);
    console.log('✓ student.html: startStudentVideoEngine reemplazado por rango');
  }
}

// 2.2 En ensureRemoteVideoCard (student.html): asegurar syncVideoGalleryMode() en la rama 2 (creación de nueva tarjeta)
const oldBranch2End = `      Object.assign(webrtcPeers[remotePeerId], {
        name: resolvedName,
        role: resolvedRole,
        cardEl: card,
        videoEl: video,
        placeholderEl: placeholder,
        nameTagEl: nameTag,
        micIconEl: micIcon,
        audioEnabled: false,
        videoEnabled: false,
        isSharingScreen: false
      });
      updateMinimizedVideoStripSummary();
      return webrtcPeers[remotePeerId];`;

const newBranch2End = `      Object.assign(webrtcPeers[remotePeerId], {
        name: resolvedName,
        role: resolvedRole,
        cardEl: card,
        videoEl: video,
        placeholderEl: placeholder,
        nameTagEl: nameTag,
        micIconEl: micIcon,
        audioEnabled: false,
        videoEnabled: false,
        isSharingScreen: false
      });
      updateMinimizedVideoStripSummary();
      if (typeof syncVideoGalleryMode === 'function') {
        syncVideoGalleryMode();
      }
      return webrtcPeers[remotePeerId];`;

if (student.includes(oldBranch2End)) {
  student = student.replace(oldBranch2End, newBranch2End);
  console.log('✓ student.html: syncVideoGalleryMode() enlazado en rama 2 de ensureRemoteVideoCard');
} else {
  console.log('! student.html: oldBranch2End no encontrado');
}

// 2.3 Fallback progresivo en startP2PScreenShare() y renegociación SDP hacia pares (student.html)
const idxP2PSS = student.indexOf('async function startP2PScreenShare() {');
const idxP2PSSEnd = student.indexOf('async function stopP2PScreenShare() {', idxP2PSS);

if (idxP2PSS !== -1 && idxP2PSSEnd !== -1) {
  const newStartP2PSS = `async function startP2PScreenShare() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        showMediaAlert('Tu navegador móvil no soporta compartir pantalla.');
        return;
      }
      let sStream = null;
      try {
        // Nivel 1: Constraints completas con audio (ideal para PC / Mac)
        sStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
      } catch (err1) {
        console.warn('[ScreenShare Fallback] Falló captura con audio, reintentando solo video (móviles):', err1);
        try {
          // Nivel 2: Solo video sin audio ni restricciones de cursor (requerido para Chrome Android)
          sStream = await navigator.mediaDevices.getDisplayMedia({
            video: true
          });
        } catch (err2) {
          console.error('[ScreenShare Error]', err2);
          if (err2.name !== 'AbortError' && err2.name !== 'NotAllowedError') {
            showMediaAlert('No se pudo compartir pantalla: ' + (err2.message || err2.name || err2));
          }
          return;
        }
      }

      if (!sStream) return;
      screenStream = sStream;

      const screenVideoTrack = screenStream.getVideoTracks()[0];
      if (!screenVideoTrack) return;
      isSharingScreen = true;

      screenVideoTrack.onended = () => {
        stopP2PScreenShare();
      };

      const stageVideo = document.getElementById('remoteScreenShareVideo');
      if (stageVideo) {
        stageVideo.srcObject = screenStream;
        stageVideo.muted = true;
        stageVideo.play().catch(() => {});
      }

      for (const remotePeerId of Object.keys(webrtcPeers)) {
        const peerObj = webrtcPeers[remotePeerId];
        if (peerObj && peerObj.videoSender) {
          try { await peerObj.videoSender.replaceTrack(screenVideoTrack); } catch (e) {}
        }
      }

      // Disparar renegociación SDP hacia los pares para que reciban la pantalla compartida de inmediato
      if (typeof syncP2PTracksToAllPeers === 'function') {
        try { await syncP2PTracksToAllPeers(); } catch (e) {}
      }

      updateLocalMediaUI();
      syncStudentRemoteScreenShareOverlay();
      if (typeof syncVideoGalleryMode === 'function') {
        syncVideoGalleryMode();
      }
      broadcastScreenShareState(true);
    }

    `;
  student = student.substring(0, idxP2PSS) + newStartP2PSS + student.substring(idxP2PSSEnd);
  console.log('✓ student.html: startP2PScreenShare implementado con fallback progresivo móvil y renegociación');
}

// 2.4 En stopP2PScreenShare() (student.html): renegociar al restaurar cámara
const idxStopSS = student.indexOf('async function stopP2PScreenShare() {');
const idxStopSSEnd = student.indexOf('function closeAllP2PConnections() {', idxStopSS);

if (idxStopSS !== -1 && idxStopSSEnd !== -1) {
  const newStopSS = `async function stopP2PScreenShare() {
      if (!isSharingScreen && !screenStream) return;
      isSharingScreen = false;

      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
        screenStream = null;
      }

      const stageVideo = document.getElementById('remoteScreenShareVideo');
      if (stageVideo) stageVideo.srcObject = null;

      const restoreTrack = (webrtcVideoEnabled && p2pLocalStream && p2pLocalStream.getVideoTracks()[0]) || null;
      for (const remotePeerId of Object.keys(webrtcPeers)) {
        const peerObj = webrtcPeers[remotePeerId];
        if (peerObj && peerObj.videoSender) {
          try { await peerObj.videoSender.replaceTrack(restoreTrack); } catch (e) {}
        }
      }

      if (typeof syncP2PTracksToAllPeers === 'function') {
        try { await syncP2PTracksToAllPeers(); } catch (e) {}
      }

      updateLocalMediaUI();
      syncStudentRemoteScreenShareOverlay();
      if (typeof syncVideoGalleryMode === 'function') {
        syncVideoGalleryMode();
      }
      broadcastScreenShareState(false);
    }

    `;
  student = student.substring(0, idxStopSS) + newStopSS + student.substring(idxStopSSEnd);
  console.log('✓ student.html: stopP2PScreenShare renegociación al restaurar cámara');
}

// 2.5 En listener de SCREEN_SHARE_STATE (student.html): activar syncVideoGalleryMode()
const idxStudentSSS = student.indexOf("event: 'SCREEN_SHARE_STATE'");
if (idxStudentSSS !== -1) {
  const startHandler = student.lastIndexOf("channel.on('broadcast', { event: 'SCREEN_SHARE_STATE' }", idxStudentSSS);
  const endHandler = student.indexOf("});", idxStudentSSS) + 3;
  if (startHandler !== -1 && endHandler > startHandler) {
    const newStudentSSS = `channel.on('broadcast', { event: 'SCREEN_SHARE_STATE' }, ({ payload }) => {
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
    student = student.substring(0, startHandler) + newStudentSSS + student.substring(endHandler);
    console.log('✓ student.html: listener SCREEN_SHARE_STATE invoca syncVideoGalleryMode()');
  }
}

fs.writeFileSync('ELT LIVE WEB/student.html', student, 'utf8');
console.log('✓ ELT LIVE WEB/student.html guardado exitosamente');

// =========================================================================
// 3. SINCRONIZAR COPIAS IDÉNTICAS EN student.html RAÍZ Y ELT LIVE WEB/index.html
// =========================================================================
fs.writeFileSync('student.html', student, 'utf8');
fs.writeFileSync('ELT LIVE WEB/index.html', student, 'utf8');
console.log('✓ Copias sincronizadas en student.html raíz y ELT LIVE WEB/index.html');

// =========================================================================
// 4. VERIFICAR SHA-256
// =========================================================================
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
