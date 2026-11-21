const fs = require('fs');

let host = fs.readFileSync('host.html', 'utf8');

// 1. toggleLocalVideo
const startToggle = 'async function toggleLocalVideo() {';
const endToggle = 'updateLocalMediaButtonsUI();';

const idxT1 = host.indexOf(startToggle);
const idxT2 = host.indexOf(endToggle, idxT1);

if (idxT1 !== -1 && idxT2 !== -1) {
  const newToggle = `async function toggleLocalVideo() {
      webrtcVideoEnabled = !webrtcVideoEnabled;
      if (currentVideoMode === 'livekit' && livekitRoom) {
        try {
          await livekitRoom.localParticipant.setCameraEnabled(webrtcVideoEnabled);
          handleLocalCameraTrack();
        } catch (err) {
          console.warn('[LiveKit] Error alternando cámara:', err);
          webrtcVideoEnabled = !webrtcVideoEnabled;
        }
      } else if (currentVideoMode === 'p2p') {
        if (!p2pLocalStream || (webrtcVideoEnabled && (!p2pLocalStream.getVideoTracks().length || !p2pLocalStream.getVideoTracks().some(t => t.readyState === 'live')))) {
          await ensureP2PLocalStream(webrtcAudioEnabled, webrtcVideoEnabled);
        }
        if (p2pLocalStream) {
          p2pLocalStream.getVideoTracks().forEach(t => { t.enabled = webrtcVideoEnabled; });
        }
        handleP2PLocalVideoUI();
        await syncP2PTracksToAllPeers();
      }
      `;
  host = host.substring(0, idxT1) + newToggle + host.substring(idxT2);
  console.log('✓ host: toggleLocalVideo updated');
} else {
  console.log('! host: toggleLocalVideo indices not found');
}

// 2. cleanupOrphanRemotePeerCards
const startClean = 'function cleanupOrphanRemotePeerCards(activePeerIds, activeStudentNames) {';
const endClean = 'if (typeof updateMinimizedVideoStripSummary === \'function\') {';

const idxClean1 = host.indexOf(startClean);
const idxClean2 = host.indexOf(endClean, idxClean1);

if (idxClean1 !== -1 && idxClean2 !== -1) {
  const newClean = `function cleanupOrphanRemotePeerCards(activePeerIds, activeStudentNames) {
      Object.keys(webrtcPeers).forEach(pid => {
        const p = webrtcPeers[pid];
        if (!p) return;
        // Blindaje: No podar si la conexión P2P está conectada, conectando o con señalización activa
        if (p.pc && (p.pc.connectionState === 'connected' || p.pc.connectionState === 'connecting' || p.pc.signalingState !== 'closed')) {
          return;
        }
        const cleanName = normalizeStudentPeerKey(p && p.name);
        // Blindaje: No podar si el alumno está registrado como admitido en studentsState
        if (cleanName && typeof studentsState === 'object' && studentsState) {
          const isAdmitted = Object.values(studentsState).some(st => normalizeStudentPeerKey(st.name || st.student_name) === cleanName);
          if (isAdmitted) return;
        }
        if (activeStudentNames && cleanName && !activeStudentNames.has(cleanName)) {
          if (!activePeerIds || !activePeerIds.has(pid)) {
            removeRemotePeerCard(pid, p.name);
          }
        }
      });

      if (webrtcRemoteCardsContainer) {
        const seenNames = new Set();
        const cards = Array.from(webrtcRemoteCardsContainer.children);
        cards.forEach(cardEl => {
          const sName = cardEl.getAttribute('data-student-name') || '';
          if (sName) {
            if (seenNames.has(sName)) {
              cardEl.remove();
              return;
            }
            if (activeStudentNames && activeStudentNames.size > 0 && !activeStudentNames.has(sName)) {
              if (typeof studentsState === 'object' && studentsState) {
                const isAdmitted = Object.values(studentsState).some(st => normalizeStudentPeerKey(st.name || st.student_name) === sName);
                if (isAdmitted) {
                  seenNames.add(sName);
                  return;
                }
              }
              cardEl.remove();
              return;
            }
            seenNames.add(sName);
          }
        });
      }

      `;
  host = host.substring(0, idxClean1) + newClean + host.substring(idxClean2);
  console.log('✓ host: cleanupOrphanRemotePeerCards updated');
} else {
  console.log('! host: cleanupOrphanRemotePeerCards indices not found');
}

// 3. updateRemotePeerCardMedia
const startMedia = 'function updateRemotePeerCardMedia(peerId) {';
const endMedia = 'syncHostScreenShareStage();';

const idxM1 = host.indexOf(startMedia);
const idxM2 = host.indexOf(endMedia, idxM1);

if (idxM1 !== -1 && idxM2 !== -1) {
  const newMedia = `function updateRemotePeerCardMedia(peerId) {
      const peerObj = webrtcPeers[peerId];
      if (!peerObj) return;
      ensureRemotePeerCard(peerId, peerObj.name);
      const vidEl = document.getElementById(\`webrtc_video_\${peerId}\`);
      const phEl = document.getElementById(\`webrtc_placeholder_\${peerId}\`);
      const muteEl = document.getElementById(\`webrtc_mute_\${peerId}\`);
      if (muteEl) {
        muteEl.classList.toggle('hidden', Boolean(peerObj.audioEnabled));
      }
      if (vidEl) {
        vidEl.setAttribute('playsinline', '');
        vidEl.setAttribute('webkit-playsinline', '');
        vidEl.setAttribute('autoplay', '');
        if (currentVideoMode === 'p2p' && peerObj.stream && vidEl.srcObject !== peerObj.stream) {
          vidEl.srcObject = peerObj.stream;
          vidEl.muted = false;
        }

        if (!vidEl.__frameDetectionAttached) {
          vidEl.__frameDetectionAttached = true;
          const onFrameReady = () => {
            if (peerObj.videoEnabled && !peerObj.isSharingScreen && vidEl.videoWidth > 0 && !vidEl.paused) {
              vidEl.classList.remove('hidden');
              if (phEl) phEl.classList.add('hidden');
            }
          };
          vidEl.addEventListener('loadedmetadata', onFrameReady);
          vidEl.addEventListener('playing', onFrameReady);
          vidEl.addEventListener('timeupdate', onFrameReady);
          vidEl.addEventListener('pause', () => {
            if (vidEl.paused && phEl) {
              vidEl.classList.add('hidden');
              phEl.classList.remove('hidden');
            }
          });
        }

        const hasStreamLiveVideoTrack = peerObj.stream && peerObj.stream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled && !t.muted);
        if (hasStreamLiveVideoTrack) {
          peerObj.videoEnabled = true;
        }
        const hasLiveDecodedFrames = vidEl.videoWidth > 0 && !vidEl.paused && vidEl.readyState >= 2;
        const shouldShowVideo = Boolean(peerObj.videoEnabled) && hasStreamLiveVideoTrack && hasLiveDecodedFrames && !peerObj.isSharingScreen;

        vidEl.classList.toggle('hidden', !shouldShowVideo);
        if (phEl) phEl.classList.toggle('hidden', shouldShowVideo);

        if (peerObj.videoEnabled && hasStreamLiveVideoTrack) {
          vidEl.play().catch(() => {});
        }
      }

      // Audio dedicado P2P en el Host para reproducción fluida aunque el video esté oculto
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
      }

      `;
  host = host.substring(0, idxM1) + newMedia + host.substring(idxM2);
  console.log('✓ host: updateRemotePeerCardMedia updated');
} else {
  console.log('! host: updateRemotePeerCardMedia indices not found');
}

fs.writeFileSync('host.html', host, 'utf8');
console.log('✓ host.html saved successfully');
