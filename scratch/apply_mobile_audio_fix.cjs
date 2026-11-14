const fs = require('fs');
const path = require('path');

const hostPath = path.resolve(__dirname, '..', 'host.html');
const studentPath = path.resolve(__dirname, '..', 'ELT LIVE WEB', 'student.html');
const studentIndexPath = path.resolve(__dirname, '..', 'ELT LIVE WEB', 'index.html');
const studentRootPath = path.resolve(__dirname, '..', 'student.html');

let host = fs.readFileSync(hostPath, 'utf8');
let student = fs.readFileSync(studentPath, 'utf8');

// Convertir temporalmente CRLF a LF para hacer reemplazos limpios e inmunes a saltos de línea de Windows
const isHostCRLF = host.includes('\r\n');
const isStudentCRLF = student.includes('\r\n');

host = host.replace(/\r\n/g, '\n');
student = student.replace(/\r\n/g, '\n');

console.log('Original Host length (normalized LF):', host.length);
console.log('Original Student length (normalized LF):', student.length);

// ==========================================
// 1. MODIFICACIONES EN ELT LIVE WEB/student.html
// ==========================================

// A) updateStudentRemotePeerCardMedia: robustecer reproducción remota de audio/video
const oldStudentUpdateMedia = `      // Elemento de audio dedicado para P2P para reproducción ininterrumpida incluso con video oculto
      if (currentVideoMode === 'p2p' && peerObj.stream && peerObj.stream.getAudioTracks().length > 0) {
        let p2pAudioEl = document.getElementById(\`webrtc_audio_\${remotePeerId}\`);
        if (!p2pAudioEl) {
          p2pAudioEl = document.createElement('audio');
          p2pAudioEl.id = \`webrtc_audio_\${remotePeerId}\`;
          p2pAudioEl.setAttribute('data-p2p-peer', remotePeerId);
          p2pAudioEl.autoplay = true;
          p2pAudioEl.setAttribute('playsinline', '');
          document.body.appendChild(p2pAudioEl);
        }
        if (p2pAudioEl.srcObject !== peerObj.stream) {
          p2pAudioEl.srcObject = peerObj.stream;
        }
        p2pAudioEl.play().catch(() => {});
      }`;

const newStudentUpdateMedia = `      // Elemento de audio dedicado para P2P para reproducción ininterrumpida incluso con video oculto
      if (currentVideoMode === 'p2p' && peerObj.stream && peerObj.stream.getAudioTracks().length > 0) {
        let p2pAudioEl = document.getElementById(\`webrtc_audio_\${remotePeerId}\`);
        if (!p2pAudioEl) {
          p2pAudioEl = document.createElement('audio');
          p2pAudioEl.id = \`webrtc_audio_\${remotePeerId}\`;
          p2pAudioEl.setAttribute('data-p2p-peer', remotePeerId);
          p2pAudioEl.autoplay = true;
          p2pAudioEl.playsInline = true;
          p2pAudioEl.setAttribute('playsinline', '');
          p2pAudioEl.setAttribute('webkit-playsinline', '');
          p2pAudioEl.muted = false;
          p2pAudioEl.volume = 1.0;
          document.body.appendChild(p2pAudioEl);
        }
        p2pAudioEl.muted = false;
        p2pAudioEl.volume = 1.0;
        if (p2pAudioEl.srcObject !== peerObj.stream) {
          p2pAudioEl.srcObject = peerObj.stream;
        }
        p2pAudioEl.play().catch(() => {});
      }`;

if (!student.includes(oldStudentUpdateMedia)) {
  console.error('ERROR: oldStudentUpdateMedia not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentUpdateMedia, newStudentUpdateMedia);

// B) Desbloqueo global de reproducción táctil / click para autoplay móvil en student.html
const unlockAudioSnippet = `
    // Desbloqueo forzado de audio remoto WebRTC en dispositivos móviles (Chrome / Safari / Firefox Android)
    function unlockAllP2PRemoteAudio() {
      try {
        const audioEls = document.querySelectorAll('audio[data-p2p-peer], audio[data-livekit-participant]');
        audioEls.forEach(el => {
          el.muted = false;
          el.volume = 1.0;
          el.play().catch(() => {});
        });
        const remoteVideos = document.querySelectorAll('#webrtcRemoteCards video, #webrtcVideoStrip video:not(#webrtcLocalVideo)');
        remoteVideos.forEach(v => {
          v.muted = false;
          v.volume = 1.0;
          v.play().catch(() => {});
        });
      } catch (e) {}
    }
    ['touchstart', 'touchend', 'click', 'keydown'].forEach(evt => {
      document.addEventListener(evt, unlockAllP2PRemoteAudio, { passive: true });
    });
`;

if (!student.includes('function unlockAllP2PRemoteAudio()')) {
  student = student.replace('function syncStudentRemoteScreenShareOverlay()', unlockAudioSnippet + '\n    function syncStudentRemoteScreenShareOverlay()');
}

// C) Asegurar que ensureP2PLocalStream en student.html pida constraints con cancelación de eco y supresión de ruido
const oldStudentEnsureAudio = `          } else if (wantAudio) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            } catch (errA) {}
          }`;

const newStudentEnsureAudio = `          } else if (wantAudio) {
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: false
              });
            } catch (errA) {
              try { stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }); } catch (errA2) {}
            }
          }`;

if (!student.includes(oldStudentEnsureAudio)) {
  console.error('ERROR: oldStudentEnsureAudio not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentEnsureAudio, newStudentEnsureAudio);

const oldStudentAddAudio = `          // Si ya existe p2pLocalStream pero falta audio
          if (wantAudio && p2pLocalStream.getAudioTracks().length === 0) {
            try {
              const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              aStream.getAudioTracks().forEach(t => p2pLocalStream.addTrack(t));
              originalMicTrack = p2pLocalStream.getAudioTracks()[0] || null;
            } catch (aErr) {
              console.warn('[P2P] No se pudo agregar pista de audio:', aErr);
            }
          }`;

const newStudentAddAudio = `          // Si ya existe p2pLocalStream pero falta audio o está finalizada
          const existingAudioTracks = p2pLocalStream.getAudioTracks();
          const hasLiveAudio = existingAudioTracks.length > 0 && existingAudioTracks.some(t => t.readyState === 'live');
          if (wantAudio && !hasLiveAudio) {
            try {
              let aStream = null;
              try {
                aStream = await navigator.mediaDevices.getUserMedia({
                  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                });
              } catch (ae1) {
                aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
              }
              if (aStream) {
                aStream.getAudioTracks().forEach(t => {
                  t.enabled = true;
                  p2pLocalStream.addTrack(t);
                });
                originalMicTrack = p2pLocalStream.getAudioTracks()[0] || null;
              }
            } catch (aErr) {
              console.warn('[P2P] No se pudo agregar pista de audio:', aErr);
            }
          }`;

if (!student.includes(oldStudentAddAudio)) {
  console.error('ERROR: oldStudentAddAudio not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentAddAudio, newStudentAddAudio);

// D) En toggleLocalAudio(): garantizar captura real y vinculación inmediata a peer connections
const oldStudentToggleAudio = `    async function toggleLocalAudio() {
      webrtcAudioEnabled = !webrtcAudioEnabled;
      if (currentVideoMode === 'livekit' && livekitRoom) {
        try {
          await livekitRoom.localParticipant.setMicrophoneEnabled(webrtcAudioEnabled);
        } catch (err) {
          console.error('[LiveKit] Error al alternar micrófono en Estudiante:', err);
          webrtcAudioEnabled = !webrtcAudioEnabled;
          showMediaAlert('No se pudo acceder al micrófono: ' + (err.message || err.name || err));
        }
      } else if (currentVideoMode === 'p2p') {
        if (!p2pLocalStream) {
          await ensureP2PLocalStream(webrtcAudioEnabled, webrtcVideoEnabled);
        }
        if (p2pLocalStream) {
          p2pLocalStream.getAudioTracks().forEach(t => { t.enabled = webrtcAudioEnabled; });
        }
        await syncP2PTracksToAllPeers();
      }
      updateLocalMediaUI();
      broadcastWebRTCMediaState();
    }`;

const newStudentToggleAudio = `    async function toggleLocalAudio() {
      webrtcAudioEnabled = !webrtcAudioEnabled;
      if (currentVideoMode === 'livekit' && livekitRoom) {
        try {
          await livekitRoom.localParticipant.setMicrophoneEnabled(webrtcAudioEnabled);
        } catch (err) {
          console.error('[LiveKit] Error al alternar micrófono en Estudiante:', err);
          webrtcAudioEnabled = !webrtcAudioEnabled;
          showMediaAlert('No se pudo acceder al micrófono: ' + (err.message || err.name || err));
        }
      } else if (currentVideoMode === 'p2p') {
        try {
          // Si el estudiante enciende su micrófono, asegurar que exista pista de audio activa
          if (webrtcAudioEnabled) {
            const hasLiveAudio = p2pLocalStream && p2pLocalStream.getAudioTracks().some(t => t.readyState === 'live');
            if (!p2pLocalStream || !hasLiveAudio) {
              try {
                let micStream = null;
                try {
                  micStream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                  });
                } catch (mErr1) {
                  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                }
                if (micStream) {
                  if (!p2pLocalStream) {
                    p2pLocalStream = micStream;
                  } else {
                    micStream.getAudioTracks().forEach(t => p2pLocalStream.addTrack(t));
                  }
                  originalMicTrack = p2pLocalStream.getAudioTracks()[0] || null;
                }
              } catch (micFetchErr) {
                console.error('[P2P] Permiso de micrófono denegado en celular:', micFetchErr);
                webrtcAudioEnabled = false;
                showMediaAlert('No se pudo activar el micrófono. Concede permiso en el navegador de tu celular.');
              }
            }
          }
          if (p2pLocalStream) {
            p2pLocalStream.getAudioTracks().forEach(t => { t.enabled = webrtcAudioEnabled; });
          }
          await syncP2PTracksToAllPeers();
        } catch (errAudio) {
          console.error('[P2P] Error en toggleLocalAudio:', errAudio);
        }
      }
      updateLocalMediaUI();
      broadcastWebRTCMediaState();
      unlockAllP2PRemoteAudio();
    }`;

if (!student.includes(oldStudentToggleAudio)) {
  console.error('ERROR: oldStudentToggleAudio not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentToggleAudio, newStudentToggleAudio);


// ==========================================
// 2. MODIFICACIONES EN host.html
// ==========================================

// A) updateRemotePeerCardMedia en host.html
const oldHostUpdateMedia = `      // Audio dedicado P2P en el Host para reproducción fluida aunque el video esté oculto
      if (currentVideoMode === 'p2p' && peerObj.stream && peerObj.stream.getAudioTracks().length > 0) {
        let p2pAudioEl = document.getElementById(\`webrtc_audio_\${peerId}\`);
        if (!p2pAudioEl) {
          p2pAudioEl = document.createElement('audio');
          p2pAudioEl.id = \`webrtc_audio_\${peerId}\`;
          p2pAudioEl.setAttribute('data-p2p-peer', peerId);
          p2pAudioEl.autoplay = true;
          p2pAudioEl.setAttribute('playsinline', '');
          document.body.appendChild(p2pAudioEl);
        }
        if (p2pAudioEl.srcObject !== peerObj.stream) {
          p2pAudioEl.srcObject = peerObj.stream;
        }
        p2pAudioEl.play().catch(() => {});
      }`;

const newHostUpdateMedia = `      // Audio dedicado P2P en el Host para reproducción fluida aunque el video esté oculto
      if (currentVideoMode === 'p2p' && peerObj.stream && peerObj.stream.getAudioTracks().length > 0) {
        let p2pAudioEl = document.getElementById(\`webrtc_audio_\${peerId}\`);
        if (!p2pAudioEl) {
          p2pAudioEl = document.createElement('audio');
          p2pAudioEl.id = \`webrtc_audio_\${peerId}\`;
          p2pAudioEl.setAttribute('data-p2p-peer', peerId);
          p2pAudioEl.autoplay = true;
          p2pAudioEl.playsInline = true;
          p2pAudioEl.setAttribute('playsinline', '');
          p2pAudioEl.setAttribute('webkit-playsinline', '');
          p2pAudioEl.muted = false;
          p2pAudioEl.volume = 1.0;
          document.body.appendChild(p2pAudioEl);
        }
        p2pAudioEl.muted = false;
        p2pAudioEl.volume = 1.0;
        if (p2pAudioEl.srcObject !== peerObj.stream) {
          p2pAudioEl.srcObject = peerObj.stream;
        }
        p2pAudioEl.play().catch(() => {});
      }`;

if (!host.includes(oldHostUpdateMedia)) {
  console.error('ERROR: oldHostUpdateMedia not found in host.html');
  process.exit(1);
}
host = host.replace(oldHostUpdateMedia, newHostUpdateMedia);

// B) Desbloqueo global de audio en host.html
const unlockHostAudioSnippet = `
    // Desbloqueo de reproducción de audio remoto P2P en el Host
    function unlockAllHostRemoteAudio() {
      try {
        const audioEls = document.querySelectorAll('audio[data-p2p-peer], audio[data-livekit-participant]');
        audioEls.forEach(el => {
          el.muted = false;
          el.volume = 1.0;
          el.play().catch(() => {});
        });
        const remoteVideos = document.querySelectorAll('#webrtcRemoteCardsContainer video');
        remoteVideos.forEach(v => {
          v.muted = false;
          v.volume = 1.0;
          v.play().catch(() => {});
        });
      } catch (e) {}
    }
    ['touchstart', 'touchend', 'click', 'keydown'].forEach(evt => {
      document.addEventListener(evt, unlockAllHostRemoteAudio, { passive: true });
    });
`;

if (!host.includes('function unlockAllHostRemoteAudio()')) {
  host = host.replace('function syncHostScreenShareStage()', unlockHostAudioSnippet + '\n    function syncHostScreenShareStage()');
}

// C) Limpieza de p2pAudioEl en removeRemotePeerCard de host.html
const oldHostRemoveCard = `      if (peerId) {
        const cardById = document.getElementById(\`webrtc_card_\${peerId}\`);
        if (cardById) cardById.remove();
        if (webrtcRemoteCardsContainer) {
          webrtcRemoteCardsContainer.querySelectorAll(\`[data-peer-id="\${peerId}"]\`).forEach(el => el.remove());
        }
        document.querySelectorAll(\`audio[data-livekit-participant="\${peerId}"]\`).forEach(a => a.remove());
      }`;

const newHostRemoveCard = `      if (peerId) {
        const cardById = document.getElementById(\`webrtc_card_\${peerId}\`);
        if (cardById) cardById.remove();
        if (webrtcRemoteCardsContainer) {
          webrtcRemoteCardsContainer.querySelectorAll(\`[data-peer-id="\${peerId}"]\`).forEach(el => el.remove());
        }
        document.querySelectorAll(\`audio[data-livekit-participant="\${peerId}"]\`).forEach(a => a.remove());
        const p2pAudio = document.getElementById(\`webrtc_audio_\${peerId}\`);
        if (p2pAudio) p2pAudio.remove();
      }`;

if (!host.includes(oldHostRemoveCard)) {
  console.error('ERROR: oldHostRemoveCard not found in host.html');
  process.exit(1);
}
host = host.replace(oldHostRemoveCard, newHostRemoveCard);

// D) En toggleLocalAudio() de host.html: asegurar captura de micrófono y unlockAllHostRemoteAudio()
const oldHostToggleAudio = `    async function toggleLocalAudio() {
      webrtcAudioEnabled = !webrtcAudioEnabled;
      if (currentVideoMode === 'livekit' && livekitRoom) {
        try {
          await livekitRoom.localParticipant.setMicrophoneEnabled(webrtcAudioEnabled);
        } catch (err) {
          console.warn('[LiveKit] Error alternando micrófono:', err);
          webrtcAudioEnabled = !webrtcAudioEnabled;
        }
      } else if (currentVideoMode === 'p2p') {
        if (!p2pLocalStream) {
          await ensureP2PLocalStream(webrtcAudioEnabled, webrtcVideoEnabled);
        }
        if (p2pLocalStream) {
          p2pLocalStream.getAudioTracks().forEach(t => { t.enabled = webrtcAudioEnabled; });
        }
        await syncP2PTracksToAllPeers();
      }
      updateLocalMediaButtonsUI();
      broadcastWebRTCMediaState();
    }`;

const newHostToggleAudio = `    async function toggleLocalAudio() {
      webrtcAudioEnabled = !webrtcAudioEnabled;
      if (currentVideoMode === 'livekit' && livekitRoom) {
        try {
          await livekitRoom.localParticipant.setMicrophoneEnabled(webrtcAudioEnabled);
        } catch (err) {
          console.warn('[LiveKit] Error alternando micrófono:', err);
          webrtcAudioEnabled = !webrtcAudioEnabled;
        }
      } else if (currentVideoMode === 'p2p') {
        try {
          if (webrtcAudioEnabled) {
            const hasLiveAudio = p2pLocalStream && p2pLocalStream.getAudioTracks().some(t => t.readyState === 'live');
            if (!p2pLocalStream || !hasLiveAudio) {
              try {
                const micStream = await navigator.mediaDevices.getUserMedia({
                  audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
                });
                if (micStream) {
                  if (!p2pLocalStream) {
                    p2pLocalStream = micStream;
                  } else {
                    micStream.getAudioTracks().forEach(t => p2pLocalStream.addTrack(t));
                  }
                  originalMicTrack = p2pLocalStream.getAudioTracks()[0] || null;
                }
              } catch (micErr) {
                console.warn('[P2P] No se pudo obtener micrófono en Host:', micErr);
              }
            }
          }
          if (p2pLocalStream) {
            p2pLocalStream.getAudioTracks().forEach(t => { t.enabled = webrtcAudioEnabled; });
          }
          await syncP2PTracksToAllPeers();
        } catch (errAudio) {
          console.warn('[P2P] Error en toggleLocalAudio Host:', errAudio);
        }
      }
      updateLocalMediaButtonsUI();
      broadcastWebRTCMediaState();
      unlockAllHostRemoteAudio();
    }`;

if (!host.includes(oldHostToggleAudio)) {
  console.error('ERROR: oldHostToggleAudio not found in host.html');
  process.exit(1);
}
host = host.replace(oldHostToggleAudio, newHostToggleAudio);

// Restaurar terminaciones de línea originales
if (isHostCRLF) {
  host = host.replace(/\n/g, '\r\n');
}
if (isStudentCRLF) {
  student = student.replace(/\n/g, '\r\n');
}

// ==========================================
// 3. GUARDAR Y SINCRONIZAR COPIAS IDÉNTICAS
// ==========================================

fs.writeFileSync(hostPath, host, 'utf8');
console.log('host.html updated successfully.');

fs.writeFileSync(studentPath, student, 'utf8');
console.log('ELT LIVE WEB/student.html updated successfully.');

fs.writeFileSync(studentIndexPath, student, 'utf8');
console.log('ELT LIVE WEB/index.html synced successfully.');

fs.writeFileSync(studentRootPath, student, 'utf8');
console.log('student.html root synced successfully.');
