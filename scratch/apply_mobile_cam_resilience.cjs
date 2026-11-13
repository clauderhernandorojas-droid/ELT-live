const fs = require('fs');
const path = require('path');

const studentPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/ELT LIVE WEB/student.html');
const indexPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/ELT LIVE WEB/index.html');
const rootStudentPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/student.html');

console.log('Reading student.html...');
let studentContent = fs.readFileSync(studentPath, 'utf8');
const hadCRLF = studentContent.includes('\r\n');
studentContent = studentContent.replace(/\r\n/g, '\n');

// 1. BLINDAJE EN ensureP2PLocalStream CON FALLBACK PROGRESIVO DE 3 NIVELES
const ensureStreamTarget = `    async function ensureP2PLocalStream(wantAudio, wantVideo) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showMediaAlert('Tu navegador no soporta acceso a cámara o micrófono WebRTC.');
        return null;
      }
      try {
        if (!p2pLocalStream) {
          // Intentar primero con facingMode: 'user' optimizado para celular Android
          try {
            p2pLocalStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: {
                facingMode: 'user',
                width: { ideal: 480 },
                height: { ideal: 360 },
                frameRate: { max: 20 }
              }
            });
          } catch (camErr) {
            console.warn('[P2P] Falló getUserMedia con resolución ideal, reintentando con facingMode básico:', camErr);
            p2pLocalStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: { facingMode: 'user' }
            });
          }
          p2pLocalStream.getAudioTracks().forEach(t => { t.enabled = Boolean(wantAudio); });
          p2pLocalStream.getVideoTracks().forEach(t => { t.enabled = Boolean(wantVideo); });
          originalCamTrack = p2pLocalStream.getVideoTracks()[0] || null;
          originalMicTrack = p2pLocalStream.getAudioTracks()[0] || null;
        } else {
          if (wantAudio && p2pLocalStream.getAudioTracks().length === 0) {
            const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            aStream.getAudioTracks().forEach(t => p2pLocalStream.addTrack(t));
            originalMicTrack = p2pLocalStream.getAudioTracks()[0] || null;
          }
          if (wantVideo && (!p2pLocalStream.getVideoTracks().length || !p2pLocalStream.getVideoTracks().some(t => t.readyState === 'live'))) {
            let vStream = null;
            try {
              vStream = await navigator.mediaDevices.getUserMedia({
                video: {
                  facingMode: 'user',
                  width: { ideal: 480 },
                  height: { ideal: 360 },
                  frameRate: { max: 20 }
                }
              });
            } catch (errFallback) {
              vStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
              });
            }
            vStream.getVideoTracks().forEach(t => {
              t.enabled = true;
              p2pLocalStream.addTrack(t);
            });
            originalCamTrack = p2pLocalStream.getVideoTracks()[0] || null;
          }
        }

        handleP2PLocalVideoUI();
        await syncP2PTracksToAllPeers();
        return p2pLocalStream;
      } catch (err) {
        console.error('[P2P] Error al acceder a cámara/micrófono:', err);
        const errorDetail = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Permiso de cámara denegado. Habilítalo en la configuración de tu navegador.'
          : (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError'
            ? 'No se detectó cámara frontal en tu celular.'
            : (err.name === 'NotReadableError' || err.name === 'TrackStartError'
              ? 'La cámara está siendo utilizada por otra aplicación.'
              : \`Error de cámara: \${err.message || err.name || err}\`));
        showMediaAlert(errorDetail);
        return null;
      }
    }`;

const ensureStreamReplacement = `    async function ensureP2PLocalStream(wantAudio, wantVideo) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showMediaAlert('Tu navegador no soporta acceso a cámara o micrófono WebRTC.');
        return null;
      }
      try {
        if (!p2pLocalStream) {
          let stream = null;
          if (wantVideo) {
            // Nivel 1: Constraints ideales para móvil (480x360@20fps frontal)
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: Boolean(wantAudio),
                video: {
                  facingMode: 'user',
                  width: { ideal: 480 },
                  height: { ideal: 360 },
                  frameRate: { max: 20 }
                }
              });
            } catch (err1) {
              console.warn('[P2P Cam Fallback 1] Falló ideal constraints, intentando facingMode básico:', err1);
              // Nivel 2: Solo facingMode user básico sin restricciones estrictas
              try {
                stream = await navigator.mediaDevices.getUserMedia({
                  audio: Boolean(wantAudio),
                  video: { facingMode: 'user' }
                });
              } catch (err2) {
                console.warn('[P2P Cam Fallback 2] Falló facingMode user, intentando video: true genérico:', err2);
                // Nivel 3: video: true genérico universal
                try {
                  stream = await navigator.mediaDevices.getUserMedia({
                    audio: Boolean(wantAudio),
                    video: true
                  });
                } catch (err3) {
                  console.error('[P2P Cam Fallback 3] Falló toda captura de video:', err3);
                  // Si el video falla pero se solicitaba audio, rescatar al menos el micrófono
                  if (wantAudio) {
                    try {
                      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    } catch (errA) {}
                  }
                }
              }
            }
          } else if (wantAudio) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            } catch (errA) {}
          }

          if (stream) {
            p2pLocalStream = stream;
            p2pLocalStream.getAudioTracks().forEach(t => { t.enabled = Boolean(wantAudio); });
            p2pLocalStream.getVideoTracks().forEach(t => { t.enabled = Boolean(wantVideo); });
            originalCamTrack = p2pLocalStream.getVideoTracks()[0] || null;
            originalMicTrack = p2pLocalStream.getAudioTracks()[0] || null;
          }
        } else {
          // Si ya existe p2pLocalStream pero falta audio
          if (wantAudio && p2pLocalStream.getAudioTracks().length === 0) {
            try {
              const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              aStream.getAudioTracks().forEach(t => p2pLocalStream.addTrack(t));
              originalMicTrack = p2pLocalStream.getAudioTracks()[0] || null;
            } catch (aErr) {
              console.warn('[P2P] No se pudo agregar pista de audio:', aErr);
            }
          }
          // Si falta video o está inactivo, reintentar con fallback progresivo de 3 niveles
          if (wantVideo && (!p2pLocalStream.getVideoTracks().length || !p2pLocalStream.getVideoTracks().some(t => t.readyState === 'live'))) {
            let vStream = null;
            try {
              vStream = await navigator.mediaDevices.getUserMedia({
                video: {
                  facingMode: 'user',
                  width: { ideal: 480 },
                  height: { ideal: 360 },
                  frameRate: { max: 20 }
                }
              });
            } catch (errFallback1) {
              console.warn('[P2P Cam AddTrack Fallback 1] Falló ideal constraints:', errFallback1);
              try {
                vStream = await navigator.mediaDevices.getUserMedia({
                  video: { facingMode: 'user' }
                });
              } catch (errFallback2) {
                console.warn('[P2P Cam AddTrack Fallback 2] Falló facingMode user:', errFallback2);
                try {
                  vStream = await navigator.mediaDevices.getUserMedia({ video: true });
                } catch (errFallback3) {
                  console.error('[P2P Cam AddTrack Fallback 3] Falló video:', errFallback3);
                }
              }
            }
            if (vStream) {
              vStream.getVideoTracks().forEach(t => {
                t.enabled = true;
                p2pLocalStream.addTrack(t);
              });
              originalCamTrack = p2pLocalStream.getVideoTracks()[0] || null;
            }
          }
        }

        try { handleP2PLocalVideoUI(); } catch (e) {}
        try { await syncP2PTracksToAllPeers(); } catch (e) {}
        return p2pLocalStream;
      } catch (err) {
        console.error('[P2P] Error en ensureP2PLocalStream:', err);
        const errorDetail = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Permiso de cámara denegado. Habilítalo en la configuración de tu navegador.'
          : (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError'
            ? 'No se detectó cámara frontal en tu celular.'
            : (err.name === 'NotReadableError' || err.name === 'TrackStartError'
              ? 'La cámara está siendo utilizada por otra aplicación.'
              : \`Error de cámara: \${err.message || err.name || err}\`));
        showMediaAlert(errorDetail);
        return null;
      }
    }`;

if (!studentContent.includes(ensureStreamTarget)) {
  console.error('Could not find ensureP2PLocalStream in student.html');
  process.exit(1);
}
studentContent = studentContent.replace(ensureStreamTarget, ensureStreamReplacement);

// 2. BLINDAJE EN toggleLocalVideo: try/catch total sin expulsión ni recarga
const toggleVideoTarget = `    async function toggleLocalVideo() {
      webrtcVideoEnabled = !webrtcVideoEnabled;
      if (currentVideoMode === 'livekit' && livekitRoom) {
        try {
          if (webrtcVideoEnabled) {
            await livekitRoom.localParticipant.setCameraEnabled(true, {
              facingMode: 'user'
            });
          } else {
            await livekitRoom.localParticipant.setCameraEnabled(false);
          }
          handleStudentLocalCameraTrack();
        } catch (err) {
          console.error('[LiveKit] Error al alternar cámara en Estudiante:', err);
          webrtcVideoEnabled = !webrtcVideoEnabled;
          showMediaAlert('No se pudo encender la cámara frontal: ' + (err.message || err.name || err));
        }
      } else if (currentVideoMode === 'p2p') {
        try {
          if (webrtcVideoEnabled) {
            const stream = await ensureP2PLocalStream(webrtcAudioEnabled, true);
            if (!stream) {
              webrtcVideoEnabled = false;
            }
          }
          if (p2pLocalStream) {
            p2pLocalStream.getVideoTracks().forEach(t => { t.enabled = webrtcVideoEnabled; });
          }
          handleP2PLocalVideoUI();
          await syncP2PTracksToAllPeers();
        } catch (err) {
          console.error('[P2P] Error al alternar cámara P2P:', err);
          webrtcVideoEnabled = !webrtcVideoEnabled;
          showMediaAlert('Error al activar cámara frontal P2P: ' + (err.message || err.name || err));
        }
      }
      updateLocalMediaUI();
      broadcastWebRTCMediaState();
    }`;

const toggleVideoReplacement = `    async function toggleLocalVideo() {
      try {
        webrtcVideoEnabled = !webrtcVideoEnabled;
        if (currentVideoMode === 'livekit' && livekitRoom) {
          try {
            if (webrtcVideoEnabled) {
              try {
                await livekitRoom.localParticipant.setCameraEnabled(true, { facingMode: 'user' });
              } catch (lkErr) {
                console.warn('[LiveKit] Falló setCameraEnabled con facingMode, reintentando básico:', lkErr);
                await livekitRoom.localParticipant.setCameraEnabled(true);
              }
            } else {
              await livekitRoom.localParticipant.setCameraEnabled(false);
            }
            try { handleStudentLocalCameraTrack(); } catch (e) {}
          } catch (err) {
            console.error('[LiveKit] Error al alternar cámara en Estudiante:', err);
            webrtcVideoEnabled = !webrtcVideoEnabled;
            showMediaAlert('No se pudo encender la cámara frontal: ' + (err.message || err.name || err));
          }
        } else if (currentVideoMode === 'p2p') {
          try {
            if (webrtcVideoEnabled) {
              const stream = await ensureP2PLocalStream(webrtcAudioEnabled, true);
              if (!stream || !stream.getVideoTracks().some(t => t.readyState === 'live')) {
                webrtcVideoEnabled = false;
              }
            }
            if (p2pLocalStream) {
              p2pLocalStream.getVideoTracks().forEach(t => { t.enabled = webrtcVideoEnabled; });
            }
            try { handleP2PLocalVideoUI(); } catch (e) {}
            try { await syncP2PTracksToAllPeers(); } catch (syncErr) {
              console.warn('[P2P] syncP2PTracksToAllPeers aviso:', syncErr);
            }
          } catch (err) {
            console.error('[P2P] Error al alternar cámara P2P:', err);
            webrtcVideoEnabled = !webrtcVideoEnabled;
            showMediaAlert('Error al activar cámara frontal: ' + (err.message || err.name || err));
          }
        }
      } catch (fatalCamErr) {
        console.error('[toggleLocalVideo] Error atrapado y blindado:', fatalCamErr);
      } finally {
        try { updateLocalMediaUI(); } catch (e) {}
        try { broadcastWebRTCMediaState(); } catch (e) {}
      }
    }`;

if (!studentContent.includes(toggleVideoTarget)) {
  console.error('Could not find toggleLocalVideo in student.html');
  process.exit(1);
}
studentContent = studentContent.replace(toggleVideoTarget, toggleVideoReplacement);

// 3. EVITAR EXPULSIÓN EN RECONEXIÓN DE SUPABASE (myChannel.subscribe)
const subscribeTarget = `      myChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          document.getElementById('joinScreen').classList.add('hidden');
          document.getElementById('waitingRoomScreen').classList.remove('hidden');

          const sendWaitingJoin = () => {
            if (!myChannel || isAdmittedToClass) return;
            myChannel.send({
              type: 'broadcast',
              event: 'WAITING_ROOM_JOIN',
              payload: {
                studentId: myStudentId,
                studentName: myName,
                peerId: webrtcPeerId,
                timestamp: Date.now()
              }
            });
          };

          sendWaitingJoin();
          if (waitingRoomPingInterval) clearInterval(waitingRoomPingInterval);
          waitingRoomPingInterval = setInterval(sendWaitingJoin, 4000);
        }
      });`;

const subscribeReplacement = `      myChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Blindaje anti-expulsión: Si el estudiante ya fue admitido y hay reconexión (ej. cambio de foco/permiso de cámara en móvil),
          // NUNCA volver a mostrar la sala de espera ni salir del aula en vivo
          if (isAdmittedToClass) {
            try {
              await myChannel.track({
                name: myName,
                role: 'student',
                peerId: webrtcPeerId,
                studentId: myStudentId,
                audioEnabled: webrtcAudioEnabled,
                videoEnabled: webrtcVideoEnabled,
                joinedAt: new Date().toISOString()
              });
            } catch (e) {}
            return;
          }

          document.getElementById('joinScreen').classList.add('hidden');
          document.getElementById('waitingRoomScreen').classList.remove('hidden');

          const sendWaitingJoin = () => {
            if (!myChannel || isAdmittedToClass) return;
            myChannel.send({
              type: 'broadcast',
              event: 'WAITING_ROOM_JOIN',
              payload: {
                studentId: myStudentId,
                studentName: myName,
                peerId: webrtcPeerId,
                timestamp: Date.now()
              }
            });
          };

          sendWaitingJoin();
          if (waitingRoomPingInterval) clearInterval(waitingRoomPingInterval);
          waitingRoomPingInterval = setInterval(sendWaitingJoin, 4000);
        }
      });`;

if (!studentContent.includes(subscribeTarget)) {
  console.error('Could not find myChannel.subscribe in student.html');
  process.exit(1);
}
studentContent = studentContent.replace(subscribeTarget, subscribeReplacement);

// 4. EVITAR EXPULSIÓN POR EVENTOS presence: leave Y AGREGAR LISTENER SESSION_ENDED
const presenceLeaveTarget = `      myChannel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (!isAdmittedToClass) return;
        const state = myChannel.presenceState();
        const remaining = Array.isArray(state[key]) ? state[key].filter(Boolean) : [];
        if (remaining.length === 0 && Array.isArray(leftPresences)) {
          leftPresences.forEach(lp => {
            if (lp && typeof removeStudentRemoteVideoCard === 'function') {
              removeStudentRemoteVideoCard(lp.peerId, lp.name, key === 'host' || lp.role === 'host' ? 'host' : 'student');
            }
          });
        }
      });`;

const presenceLeaveReplacement = `      myChannel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (!isAdmittedToClass) return;
        // Blindaje contra micro-cortes de red móvil y pausas de foco al pedir permisos de cámara:
        // Los eventos transitorios leave nunca expulsan al estudiante de #liveScreen.
        const state = myChannel.presenceState();
        const remaining = Array.isArray(state[key]) ? state[key].filter(Boolean) : [];
        if (remaining.length === 0 && Array.isArray(leftPresences)) {
          leftPresences.forEach(lp => {
            // No retirar al profesor por micro-cortes de presencia para evitar parpadeos
            if (key === 'host' || (lp && lp.role === 'host')) return;
            if (lp && typeof removeStudentRemoteVideoCard === 'function') {
              removeStudentRemoteVideoCard(lp.peerId, lp.name, 'student');
            }
          });
        }
      });

      // El estudiante solo abandona la sala cuando el profesor finaliza la sesión o hace clic en Salir
      myChannel.on('broadcast', { event: 'SESSION_ENDED' }, async () => {
        console.log('[ELT Live] El profesor ha finalizado la sesión.');
        alert('La clase ha finalizado. El profesor ha cerrado la sesión.');
        await leaveStudentSession();
      });`;

if (!studentContent.includes(presenceLeaveTarget)) {
  console.error('Could not find presence leave listener in student.html');
  process.exit(1);
}
studentContent = studentContent.replace(presenceLeaveTarget, presenceLeaveReplacement);

// Restore CRLF if file originally had it
if (hadCRLF) {
  studentContent = studentContent.replace(/\n/g, '\r\n');
}

// Write to student.html, index.html, and root student.html
fs.writeFileSync(studentPath, studentContent, 'utf8');
fs.writeFileSync(indexPath, studentContent, 'utf8');
fs.writeFileSync(rootStudentPath, studentContent, 'utf8');

console.log('Successfully applied mobile camera resilience and anti-ejection shield to all 3 student files!');

