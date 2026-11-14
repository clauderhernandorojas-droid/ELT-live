const fs = require('fs');

function normalizeNewlines(str) {
  return str.replace(/\r\n/g, '\n');
}

// ==============================================================
// 1. UPDATE host.html
// ==============================================================
function updateHost() {
  let content = fs.readFileSync('host.html', 'utf8');
  let isCrlf = content.includes('\r\n');
  content = normalizeNewlines(content);

  // 1.1 Remove Jitsi/VDO dock CSS rules (around line 148-185)
  const cssMatch = content.match(/\/\*\s*Reducción drástica del dock flotante[\s\S]*?#webrtcVideoStrip\.jitsi-mode\.jitsi-expanded #jitsiDockContainer\s*\{[\s\S]*?\}\s*/);
  if (cssMatch) {
    content = content.replace(cssMatch[0], '');
    console.log('Host: Removed Jitsi dock CSS');
  }

  // 1.2 Update Mode selector buttons in Lobby & Header
  content = content.replace(
    `<button id="btnVideoModeP2P" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-emerald-600 text-white shadow-xs" title="Modo Gratis: VDO.Ninja SFU ilimitado y gratis (sin cuota, sin login)">
            <i class="fa-solid fa-users text-[11px]"></i>
            <span>Gratis (VDO SFU)</span>
          </button>`,
    `<button id="btnVideoModeP2P" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-emerald-600 text-white shadow-xs" title="Modo Gratis: WebRTC Nativo con STUN/TURN (sin cuotas)">
            <i class="fa-solid fa-users text-[11px]"></i>
            <span>Gratis (Nativo)</span>
          </button>`
  );

  content = content.replace(
    `<button id="headerBtnVideoModeP2P" type="button" class="px-2 py-1 rounded text-[10px] font-bold transition bg-emerald-600 text-white" title="Modo Gratis VDO.Ninja SFU Ilimitado">
          <i class="fa-solid fa-users text-[9px] mr-1"></i>Gratis (VDO SFU)
        </button>`,
    `<button id="headerBtnVideoModeP2P" type="button" class="px-2 py-1 rounded text-[10px] font-bold transition bg-emerald-600 text-white" title="Modo Gratis: WebRTC Nativo con STUN/TURN">
          <i class="fa-solid fa-users text-[9px] mr-1"></i>Gratis (Nativo)
        </button>`
  );

  // 1.3 Remove jitsiDockContainer and btnToggleExpandJitsi from HTML in host.html
  // Currently:
  // <div id="webrtcStripExpandedBody" class="relative flex items-center gap-2 overflow-x-auto pr-5">
  //   <!-- Contenedor Jitsi Meet SFU embebido (Modo Gratis) -->
  //   <div id="jitsiDockContainer" ...></div>
  //   <!-- Miniatura Local (Host) -->
  content = content.replace(
    /<!-- Contenedor Jitsi Meet SFU embebido \(Modo Gratis\) -->\s*<div id="jitsiDockContainer"[\s\S]*?<\/div>\s*/,
    ''
  );

  // Remove btnToggleExpandJitsi
  content = content.replace(
    `<div class="absolute top-0.5 right-0.5 flex items-center gap-1 z-10">
            <button id="btnToggleExpandJitsi" type="button" class="w-5 h-5 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-white/15 flex items-center justify-center text-[11px] font-bold leading-none shadow cursor-pointer transition" title="Expandir / Reducir tamaño de video">
              ⤢
            </button>
            <button id="btnMinimizeVideoStrip" type="button" class="w-5 h-5 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-white/15 flex items-center justify-center text-[11px] font-bold leading-none shadow cursor-pointer transition" title="Minimizar miniatura de video">
              —
            </button>
          </div>`,
    `<button id="btnMinimizeVideoStrip" type="button" class="absolute top-0.5 right-0.5 w-5 h-5 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-white/15 flex items-center justify-center text-[11px] font-bold leading-none shadow cursor-pointer transition z-10" title="Minimizar miniatura de video">
            —
          </button>`
  );

  // 1.4 Update WAITING_ROOM_ADMIT payload
  content = content.replace(
    /payload:\s*\{\s*studentId:\s*studentId,\s*studentName:\s*st\.name,\s*videoMode:\s*currentVideoMode,\s*videoEngine:\s*currentVideoMode,\s*vdoRoom:\s*getOrCreateVDORoomName\(\),\s*roomPin:\s*roomPin\s*\}/,
    `payload: {
          studentId: studentId,
          studentName: st.name,
          videoMode: currentVideoMode,
          videoEngine: currentVideoMode,
          roomPin: roomPin
        }`
  );

  // 1.5 Update roomChannel.track in host.html
  content = content.replace(
    /await roomChannel\.track\(\{\s*name:\s*'Profesor \(Host\)',\s*role:\s*'host',\s*videoMode:\s*currentVideoMode,\s*videoEngine:\s*currentVideoMode,\s*vdoRoom:\s*getOrCreateVDORoomName\(\),\s*peerId:\s*webrtcMyPeerId,\s*audioEnabled:\s*webrtcAudioEnabled,\s*videoEnabled:\s*webrtcVideoEnabled\s*\}\);/,
    `await roomChannel.track({
            name: 'Profesor (Host)',
            role: 'host',
            videoMode: currentVideoMode,
            videoEngine: currentVideoMode,
            peerId: webrtcMyPeerId,
            audioEnabled: webrtcAudioEnabled,
            videoEnabled: webrtcVideoEnabled
          });`
  );

  // 1.6 Remove currentJitsiRoomName line in startHostSessionWithPin
  content = content.replace(
    /\s*currentJitsiRoomName\s*=\s*'ELTLive_'[\s\S]*?;\s*/,
    '\n'
  );

  // 1.7 Replace VDO section with clean P2P architecture & WEBRTC_ICE_SERVERS
  const hostVDOSectionOldMatch = content.match(/\/\/\s*==================== ARQUITECTURA DUAL DE VIDEO:[\s\S]*?const WEBRTC_ICE_SERVERS = \{[\s\S]*?iceCandidatePoolSize: 10\s*\};/);
  if (!hostVDOSectionOldMatch) {
    throw new Error('Host VDO section match failed');
  }

  const hostDualSectionNew = `// ==================== ARQUITECTURA DUAL DE VIDEO: WEBRTC NATIVO (P2P) / LIVEKIT SFU ====================
    let rawStoredMode = localStorage.getItem('elt_host_video_mode');
    let currentVideoMode = (rawStoredMode === 'livekit') ? 'livekit' : 'p2p';

    function setHostVideoMode(mode) {
      currentVideoMode = (mode === 'livekit') ? 'livekit' : 'p2p';
      try {
        localStorage.setItem('elt_host_video_mode', currentVideoMode);
      } catch (e) {}
      updateVideoModeUI();
      if (roomPin && roomChannel) {
        broadcastVideoModeConfig(currentVideoMode);
        startHostVideoEngine(currentVideoMode);
      }
    }

    function updateVideoModeUI() {
      const isP2P = (currentVideoMode === 'p2p');

      const btnP2P = document.getElementById('btnVideoModeP2P');
      const btnLK = document.getElementById('btnVideoModeLiveKit');
      if (btnP2P && btnLK) {
        btnP2P.className = isP2P
          ? 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-emerald-600 text-white shadow-xs'
          : 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white';
        btnLK.className = !isP2P
          ? 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-indigo-600 text-white shadow-xs'
          : 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white';
      }

      const hBtnP2P = document.getElementById('headerBtnVideoModeP2P');
      const hBtnLK = document.getElementById('headerBtnVideoModeLiveKit');
      if (hBtnP2P && hBtnLK) {
        hBtnP2P.className = isP2P
          ? 'px-2 py-1 rounded text-[10px] font-bold transition bg-emerald-600 text-white'
          : 'px-2 py-1 rounded text-[10px] font-bold transition text-slate-400 hover:text-white';
        hBtnLK.className = !isP2P
          ? 'px-2 py-1 rounded text-[10px] font-bold transition bg-indigo-600 text-white'
          : 'px-2 py-1 rounded text-[10px] font-bold transition text-slate-400 hover:text-white';
      }
    }

    function broadcastVideoModeConfig(mode) {
      if (!roomChannel) return;
      const targetMode = (mode === 'livekit') ? 'livekit' : 'p2p';
      roomChannel.send({
        type: 'broadcast',
        event: 'VIDEO_MODE_CONFIG',
        payload: {
          videoMode: targetMode,
          videoEngine: targetMode,
          roomPin: roomPin
        }
      });
    }

    document.getElementById('btnVideoModeP2P')?.addEventListener('click', () => setHostVideoMode('p2p'));
    document.getElementById('btnVideoModeLiveKit')?.addEventListener('click', () => setHostVideoMode('livekit'));
    document.getElementById('headerBtnVideoModeP2P')?.addEventListener('click', () => setHostVideoMode('p2p'));
    document.getElementById('headerBtnVideoModeLiveKit')?.addEventListener('click', () => setHostVideoMode('livekit'));

    // Configuración STUN + TURN OpenRelay gratuito para conexiones WebRTC Nativas
    const WEBRTC_ICE_SERVERS = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: [
            'turn:openrelay.metered.ca:80',
            'turn:openrelay.metered.ca:443',
            'turns:openrelay.metered.ca:443?transport=tcp'
          ],
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      iceCandidatePoolSize: 10
    };`;

  content = content.replace(hostVDOSectionOldMatch[0], hostDualSectionNew);

  // 1.8 Unblock getOrCreateP2PPeerConnection (remove disabled return null)
  content = content.replace(
    `function getOrCreateP2PPeerConnection(remotePeerId, remoteName) {
      // P2P desactivado en favor de Jitsi SFU y LiveKit SFU
      return null;`,
    `function getOrCreateP2PPeerConnection(remotePeerId, remoteName) {`
  );

  // 1.9 Ensure ensureRemotePeerCard guard permits 'p2p' and 'livekit'
  content = content.replace(
    "if (currentVideoMode === 'vdo' || currentVideoMode === 'jitsi') return null;",
    ""
  );

  // 1.10 In ensureP2PLocalStream: add automatic resolution downscale for 3+ participants
  const hostEnsureStreamOld = `    async function ensureP2PLocalStream(wantAudio, wantVideo) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Tu navegador no soporta acceso a cámara/micrófono WebRTC.');
        return null;
      }
      try {
        if (!p2pLocalStream) {
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
        console.warn('[P2P] No se pudo acceder a cámara/micrófono:', err);
        return null;
      }
    }`;

  const hostEnsureStreamNew = `    async function ensureP2PLocalStream(wantAudio, wantVideo) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Tu navegador no soporta acceso a cámara/micrófono WebRTC.');
        return null;
      }
      try {
        const participantCount = Object.keys(webrtcPeers).length + 1;
        const videoConstraints = participantCount >= 3
          ? { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15, max: 15 } }
          : { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { max: 20 } };

        if (!p2pLocalStream) {
          try {
            p2pLocalStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: videoConstraints
            });
          } catch (camErr) {
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
                video: videoConstraints
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

        // Si ya hay pista de video y cambiamos a 3+ participantes, aplicar constraints en vivo
        if (p2pLocalStream && originalCamTrack && participantCount >= 3 && originalCamTrack.applyConstraints) {
          try {
            await originalCamTrack.applyConstraints({ width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15, max: 15 } });
          } catch (e) {}
        }

        handleP2PLocalVideoUI();
        await syncP2PTracksToAllPeers();
        return p2pLocalStream;
      } catch (err) {
        console.warn('[P2P] No se pudo acceder a cámara/micrófono:', err);
        return null;
      }
    }`;

  if (!content.includes(hostEnsureStreamOld)) {
    throw new Error('Host ensureP2PLocalStream match failed');
  }
  content = content.replace(hostEnsureStreamOld, hostEnsureStreamNew);

  // 1.11 Clean startHostVideoEngine in host.html
  const hostEngineOld = `    async function startHostVideoEngine(mode) {
      const targetMode = (mode === 'livekit') ? 'livekit' : 'vdo';
      currentVideoMode = targetMode;
      console.log('[ELT Live] Inicializando motor de video Host:', targetMode);

      const jitsiContainer = document.getElementById('jitsiDockContainer');
      const localCard = document.getElementById('webrtcLocalCard');
      const remoteCards = document.getElementById('webrtcRemoteCards');

      if (targetMode === 'livekit') {
        if (jitsiContainer) {
          jitsiContainer.classList.add('hidden');
          jitsiContainer.innerHTML = '';
        }
        const stripLK = document.getElementById('webrtcVideoStrip');
        if (stripLK) stripLK.classList.remove('jitsi-mode');
        if (localCard) localCard.classList.remove('hidden');
        if (remoteCards) remoteCards.classList.remove('hidden');

        if (roomPin) {
          await connectLiveKit(roomPin, 'Profesor (Host)', true);
        }
      } else {
        // Modo Gratis VDO.Ninja SFU
        if (livekitRoom) {
          try { await livekitRoom.disconnect(); } catch (e) {}
          livekitRoom = null;
        }
        if (localCard) localCard.classList.add('hidden');
        if (remoteCards) remoteCards.classList.add('hidden');
        const expandedBody = document.getElementById('webrtcStripExpandedBody');
        if (expandedBody) {
          expandedBody.querySelectorAll('[data-peer-id], [data-student-name]').forEach(c => c.classList.add('hidden'));
        }

        const strip = document.getElementById('webrtcVideoStrip');
        if (strip) strip.classList.add('jitsi-mode');

        if (jitsiContainer) {
          jitsiContainer.classList.remove('hidden');
          const vRoom = getOrCreateVDORoomName();
          mountVDONinja(jitsiContainer, vRoom, 'Profesor', true);
        }
      }
      updateLocalMediaButtonsUI();
    }`;

  const hostEngineNew = `    async function startHostVideoEngine(mode) {
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

  if (!content.includes(hostEngineOld)) {
    throw new Error('Host startHostVideoEngine match failed');
  }
  content = content.replace(hostEngineOld, hostEngineNew);

  // 1.12 Clean media toggles in host.html
  const hostTogglesOld = `    async function toggleLocalAudio() {
      webrtcAudioEnabled = !webrtcAudioEnabled;
      if (currentVideoMode === 'livekit' && livekitRoom) {
        try {
          await livekitRoom.localParticipant.setMicrophoneEnabled(webrtcAudioEnabled);
        } catch (err) {
          console.warn('[LiveKit] Error alternando micrófono:', err);
          webrtcAudioEnabled = !webrtcAudioEnabled;
        }
      } else if (currentVideoMode === 'vdo' || currentVideoMode === 'jitsi' || currentVideoMode === 'p2p') {
        const jContainer = document.getElementById('jitsiDockContainer');
        const vdoIframe = jContainer ? jContainer.querySelector('iframe') : null;
        if (vdoIframe && vdoIframe.contentWindow) {
          try {
            vdoIframe.contentWindow.postMessage({ mic: webrtcAudioEnabled }, '*');
          } catch (e) {}
        }
      }
      updateLocalMediaButtonsUI();
      broadcastWebRTCMediaState();
    }

    async function toggleLocalVideo() {
      webrtcVideoEnabled = !webrtcVideoEnabled;
      if (currentVideoMode === 'livekit' && livekitRoom) {
        try {
          await livekitRoom.localParticipant.setCameraEnabled(webrtcVideoEnabled);
          handleLocalCameraTrack();
        } catch (err) {
          console.warn('[LiveKit] Error alternando cámara:', err);
          webrtcVideoEnabled = !webrtcVideoEnabled;
        }
      } else if (currentVideoMode === 'vdo' || currentVideoMode === 'jitsi' || currentVideoMode === 'p2p') {
        const jContainer = document.getElementById('jitsiDockContainer');
        const vdoIframe = jContainer ? jContainer.querySelector('iframe') : null;
        if (vdoIframe && vdoIframe.contentWindow) {
          try {
            vdoIframe.contentWindow.postMessage({ camera: webrtcVideoEnabled }, '*');
          } catch (e) {}
        }
      }
      updateLocalMediaButtonsUI();
      broadcastWebRTCMediaState();
    }`;

  const hostTogglesNew = `    async function toggleLocalAudio() {
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
    }

    async function toggleLocalVideo() {
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
        if (!p2pLocalStream) {
          await ensureP2PLocalStream(webrtcAudioEnabled, webrtcVideoEnabled);
        }
        if (p2pLocalStream) {
          p2pLocalStream.getVideoTracks().forEach(t => { t.enabled = webrtcVideoEnabled; });
        }
        handleP2PLocalVideoUI();
        await syncP2PTracksToAllPeers();
      }
      updateLocalMediaButtonsUI();
      broadcastWebRTCMediaState();
    }`;

  if (!content.includes(hostTogglesOld)) {
    throw new Error('Host toggles match failed');
  }
  content = content.replace(hostTogglesOld, hostTogglesNew);

  // 1.13 Remove btnToggleExpandJitsi JS listener in host.html
  content = content.replace(
    /\s*const btnToggleExpandJitsi = document\.getElementById\('btnToggleExpandJitsi'\);[\s\S]*?btnToggleExpandJitsi\?\.addEventListener\('click', \(e\) => \{[\s\S]*?\}\);\s*/,
    '\n'
  );

  if (isCrlf) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync('host.html', content, 'utf8');
  console.log('Successfully restored native cards in host.html');
}

// ==============================================================
// 2. UPDATE student.html
// ==============================================================
function updateStudent() {
  let content = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');
  let isCrlf = content.includes('\r\n');
  content = normalizeNewlines(content);

  // 2.1 Remove Jitsi/VDO dock CSS rules (around line 195-250)
  const cssMatch = content.match(/\/\*\s*Reducción drástica del dock flotante[\s\S]*?@media \(max-width: 640px\)\s*\{[\s\S]*?\}\s*\}/);
  if (cssMatch) {
    content = content.replace(cssMatch[0], '');
    console.log('Student: Removed Jitsi dock CSS');
  }

  // 2.2 Remove jitsiDockContainer and btnToggleExpandJitsi from HTML in student.html
  content = content.replace(
    /<!-- Contenedor Jitsi Meet SFU embebido \(Modo Gratis\) -->\s*<div id="jitsiDockContainer"[\s\S]*?<\/div>\s*/,
    ''
  );

  content = content.replace(
    `<!-- Botones Expandir y Minimizar Cámaras -->
            <button id="btnToggleExpandJitsi" type="button" onclick="event.stopPropagation(); toggleJitsiExpandedSize()" class="self-start -mt-0.5 ml-0.5 w-6 h-6 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center text-xs font-bold transition shrink-0 cursor-pointer" title="Expandir / Reducir tamaño de video">
              ⤢
            </button>
            <button id="btnMinimizeVideoStrip" type="button" onclick="event.stopPropagation(); setVideoStripMinimized(true)" class="self-start -mt-0.5 ml-0.5 w-6 h-6 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center text-xs font-bold transition shrink-0 cursor-pointer" title="Minimizar recuadro de cámaras">
              —
            </button>`,
    `<!-- Botón Minimizar Cámaras -->
            <button id="btnMinimizeVideoStrip" type="button" onclick="event.stopPropagation(); setVideoStripMinimized(true)" class="self-start -mt-0.5 ml-0.5 w-6 h-6 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center text-xs font-bold transition shrink-0 cursor-pointer" title="Minimizar recuadro de cámaras">
              —
            </button>`
  );

  // 2.3 Update host presence sync in student.html
  const stuPresOld = `          if (key === 'host' || u.role === 'host') {
            if (u.vdoRoom) currentVDORoomName = u.vdoRoom;
            if (u.jitsiRoomName) currentVDORoomName = u.jitsiRoomName;
            const hMode = (u.videoMode === 'livekit' || u.videoEngine === 'livekit') ? 'livekit' : 'vdo';
            if (hMode !== currentVideoMode && isAdmittedToClass) {
              if (typeof startStudentVideoEngine === 'function') {
                startStudentVideoEngine(hMode);
              }
            }`;

  const stuPresNew = `          if (key === 'host' || u.role === 'host') {
            const hMode = (u.videoMode === 'livekit' || u.videoEngine === 'livekit') ? 'livekit' : 'p2p';
            if (hMode !== currentVideoMode && isAdmittedToClass) {
              if (typeof startStudentVideoEngine === 'function') {
                startStudentVideoEngine(hMode);
              }
            }`;

  if (!content.includes(stuPresOld)) {
    throw new Error('Student presence host match failed');
  }
  content = content.replace(stuPresOld, stuPresNew);

  // 2.4 Update WAITING_ROOM_ADMIT broadcast handler in student.html
  const stuAdmitOld = `      myChannel.on('broadcast', { event: 'WAITING_ROOM_ADMIT' }, ({ payload }) => {
        if (!payload) return;
        const targetId = payload.studentId;
        const targetName = (payload.studentName || '').trim().toLowerCase();
        const currentName = (myName || '').trim().toLowerCase();

        if (payload.vdoRoom) currentVDORoomName = payload.vdoRoom;
        if (payload.jitsiRoomName) currentVDORoomName = payload.jitsiRoomName;

        if (!isAdmittedToClass) {
          // Admitir solo si coincide con el studentId o studentName de este alumno
          if ((targetId && targetId === myStudentId) || (targetName && targetName === currentName)) {
            if (payload.videoMode || payload.videoEngine) {
              assignedVideoMode = (payload.videoMode === 'livekit' || payload.videoEngine === 'livekit') ? 'livekit' : 'vdo';
            }
            playGentleNotificationBeep();
            admitStudentToClass();
          }
        } else {`;

  const stuAdmitNew = `      myChannel.on('broadcast', { event: 'WAITING_ROOM_ADMIT' }, ({ payload }) => {
        if (!payload) return;
        const targetId = payload.studentId;
        const targetName = (payload.studentName || '').trim().toLowerCase();
        const currentName = (myName || '').trim().toLowerCase();

        if (!isAdmittedToClass) {
          // Admitir solo si coincide con el studentId o studentName de este alumno
          if ((targetId && targetId === myStudentId) || (targetName && targetName === currentName)) {
            if (payload.videoMode || payload.videoEngine) {
              assignedVideoMode = (payload.videoMode === 'livekit' || payload.videoEngine === 'livekit') ? 'livekit' : 'p2p';
            }
            playGentleNotificationBeep();
            admitStudentToClass();
          }
        } else {`;

  if (!content.includes(stuAdmitOld)) {
    throw new Error('Student WAITING_ROOM_ADMIT match failed');
  }
  content = content.replace(stuAdmitOld, stuAdmitNew);

  // 2.5 Replace ICE servers and remove mountVDONinjaStudent in student.html
  const stuIceAndVDOOldMatch = content.match(/\/\/\s*Configuración STUN \+ TURN OpenRelay gratuito[\s\S]*?mountVDONinjaStudent[\s\S]*?return iframe;\s*\}/);
  if (!stuIceAndVDOOldMatch) {
    throw new Error('Student ICE & VDO match failed');
  }

  const stuIceNew = `// Configuración STUN + TURN OpenRelay gratuito para conexiones WebRTC Nativas
    const WEBRTC_ICE_SERVERS = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: [
            'turn:openrelay.metered.ca:80',
            'turn:openrelay.metered.ca:443',
            'turns:openrelay.metered.ca:443?transport=tcp'
          ],
          username: 'openrelayproject',
          credential: 'openrelayproject'
        }
      ],
      iceCandidatePoolSize: 10
    };

    // Estados de Conexión LiveKit Cloud SFU y P2P Nativo
    let livekitRoom = null;
    let livekitUrl = null;
    let livekitToken = null;
    let isConnectingLiveKit = false;`;

  content = content.replace(stuIceAndVDOOldMatch[0], stuIceNew);

  // 2.6 Unblock getOrCreateP2PPeerConnection in student.html
  content = content.replace(
    `function getOrCreateP2PPeerConnection(remotePeerId, remoteName, remoteRole) {
      // P2P desactivado en favor de Jitsi SFU y LiveKit SFU
      return null;`,
    `function getOrCreateP2PPeerConnection(remotePeerId, remoteName, remoteRole) {`
  );

  // 2.7 Ensure ensureRemoteVideoCard guard is removed
  content = content.replace(
    "if (currentVideoMode === 'vdo' || currentVideoMode === 'jitsi') return null;",
    ""
  );

  // 2.8 Update ensureP2PLocalStream in student.html (downscale to 320x240@15fps for 3+ participants)
  const stuEnsureStreamOld = `    async function ensureP2PLocalStream(wantAudio, wantVideo) {
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

  const stuEnsureStreamNew = `    async function ensureP2PLocalStream(wantAudio, wantVideo) {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showMediaAlert('Tu navegador no soporta acceso a cámara o micrófono WebRTC.');
        return null;
      }
      try {
        const participantCount = Object.keys(webrtcPeers).length + 1;
        const idealWidth = participantCount >= 3 ? 320 : 480;
        const idealHeight = participantCount >= 3 ? 240 : 360;
        const idealFps = participantCount >= 3 ? 15 : 20;

        if (!p2pLocalStream) {
          let stream = null;
          if (wantVideo) {
            // Nivel 1: Constraints adaptadas según número de participantes
            try {
              stream = await navigator.mediaDevices.getUserMedia({
                audio: Boolean(wantAudio),
                video: {
                  facingMode: 'user',
                  width: { ideal: idealWidth },
                  height: { ideal: idealHeight },
                  frameRate: { ideal: idealFps, max: idealFps }
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
                  width: { ideal: idealWidth },
                  height: { ideal: idealHeight },
                  frameRate: { ideal: idealFps, max: idealFps }
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

        // Si ya hay pista activa y hay 3+ participantes, aplicar constraints en vivo
        if (p2pLocalStream && originalCamTrack && participantCount >= 3 && originalCamTrack.applyConstraints) {
          try {
            await originalCamTrack.applyConstraints({ width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 15, max: 15 } });
          } catch (e) {}
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

  if (!content.includes(stuEnsureStreamOld)) {
    throw new Error('Student ensureP2PLocalStream match failed');
  }
  content = content.replace(stuEnsureStreamOld, stuEnsureStreamNew);

  // 2.9 Clean startStudentVideoEngine in student.html
  const stuEngineOld = `    async function startStudentVideoEngine(mode) {
      const targetMode = (mode === 'livekit') ? 'livekit' : 'vdo';
      assignedVideoMode = targetMode;
      currentVideoMode = targetMode;

      // PROHIBIDO iniciar motor de video o conectar VDO.Ninja mientras el estudiante esté en Sala de Espera
      if (!isAdmittedToClass) {
        console.log('[ELT Live] Modo de video configurado a', targetMode, '— retenido en Sala de Espera hasta aprobación del profesor.');
        return;
      }

      console.log('[ELT Live] Inicializando motor de video Estudiante:', targetMode, '(Admitido:', isAdmittedToClass, ')');

      const jitsiContainer = document.getElementById('jitsiDockContainer');
      const localCard = document.getElementById('webrtcLocalCard');
      const remoteCards = document.getElementById('webrtcRemoteCards');

      if (targetMode === 'livekit') {
        if (jitsiContainer) {
          jitsiContainer.classList.add('hidden');
          jitsiContainer.innerHTML = '';
        }
        const stripLK = document.getElementById('webrtcVideoStrip');
        if (stripLK) stripLK.classList.remove('jitsi-mode');
        if (localCard) localCard.classList.remove('hidden');
        if (remoteCards) remoteCards.classList.remove('hidden');
        const expandedBodyLK = document.getElementById('webrtcStripExpandedBody');
        if (expandedBodyLK) {
          expandedBodyLK.querySelectorAll('[data-peer-id], [data-student-name]').forEach(c => c.classList.remove('hidden'));
        }

        if (currentRoomPin) {
          await connectLiveKit(currentRoomPin, myName || 'Alumno', false);
        }
      } else {
        // Modo Gratis VDO.Ninja SFU
        if (livekitRoom) {
          try { await livekitRoom.disconnect(); } catch (e) {}
          livekitRoom = null;
        }
        if (localCard) localCard.classList.add('hidden');
        if (remoteCards) remoteCards.classList.add('hidden');

        const expandedBody = document.getElementById('webrtcStripExpandedBody');
        if (expandedBody) {
          expandedBody.querySelectorAll('[data-peer-id], [data-student-name]').forEach(c => c.classList.add('hidden'));
        }

        const strip = document.getElementById('webrtcVideoStrip');
        if (strip) strip.classList.add('jitsi-mode');

        if (jitsiContainer) {
          jitsiContainer.classList.remove('hidden');
          const vRoom = currentVDORoomName || ('ELTLive' + (currentRoomPin || '0000') + 'room');
          mountVDONinjaStudent(jitsiContainer, vRoom, myName || 'Alumno');
        }
      }
      updateLocalMediaUI();
    }`;

  const stuEngineNew = `    async function startStudentVideoEngine(mode) {
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

  if (!content.includes(stuEngineOld)) {
    throw new Error('Student startStudentVideoEngine match failed');
  }
  content = content.replace(stuEngineOld, stuEngineNew);

  // 2.10 Clean media toggles in student.html
  const stuTogglesOld = `    async function toggleLocalAudio() {
      webrtcAudioEnabled = !webrtcAudioEnabled;
      if (currentVideoMode === 'livekit' && livekitRoom) {
        try {
          await livekitRoom.localParticipant.setMicrophoneEnabled(webrtcAudioEnabled);
        } catch (err) {
          console.error('[LiveKit] Error al alternar micrófono en Estudiante:', err);
          webrtcAudioEnabled = !webrtcAudioEnabled;
          showMediaAlert('No se pudo acceder al micrófono: ' + (err.message || err.name || err));
        }
      } else if (currentVideoMode === 'vdo' || currentVideoMode === 'jitsi' || currentVideoMode === 'p2p') {
        const jContainer = document.getElementById('jitsiDockContainer');
        const vdoIframe = jContainer ? jContainer.querySelector('iframe') : null;
        if (vdoIframe && vdoIframe.contentWindow) {
          try {
            vdoIframe.contentWindow.postMessage({ mic: webrtcAudioEnabled }, '*');
          } catch (e) {}
        }
      }
      updateLocalMediaUI();
      broadcastWebRTCMediaState();
    }

    async function toggleLocalVideo() {
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
        } else if (currentVideoMode === 'vdo' || currentVideoMode === 'jitsi' || currentVideoMode === 'p2p') {
          const jContainer = document.getElementById('jitsiDockContainer');
          const vdoIframe = jContainer ? jContainer.querySelector('iframe') : null;
          if (vdoIframe && vdoIframe.contentWindow) {
            try {
              vdoIframe.contentWindow.postMessage({ camera: webrtcVideoEnabled }, '*');
            } catch (e) {}
          }
        }
      } catch (fatalCamErr) {
        console.error('[toggleLocalVideo] Error atrapado y blindado:', fatalCamErr);
      } finally {
        try { updateLocalMediaUI(); } catch (e) {}
        try { broadcastWebRTCMediaState(); } catch (e) {}
      }
    }`;

  const stuTogglesNew = `    async function toggleLocalAudio() {
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
    }

    async function toggleLocalVideo() {
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
          if (!p2pLocalStream) {
            await ensureP2PLocalStream(webrtcAudioEnabled, webrtcVideoEnabled);
          }
          if (p2pLocalStream) {
            p2pLocalStream.getVideoTracks().forEach(t => { t.enabled = webrtcVideoEnabled; });
          }
          try { handleP2PLocalVideoUI(); } catch (e) {}
          await syncP2PTracksToAllPeers();
        }
      } catch (fatalCamErr) {
        console.error('[toggleLocalVideo] Error atrapado y blindado:', fatalCamErr);
      } finally {
        try { updateLocalMediaUI(); } catch (e) {}
        try { broadcastWebRTCMediaState(); } catch (e) {}
      }
    }`;

  if (!content.includes(stuTogglesOld)) {
    throw new Error('Student toggles match failed');
  }
  content = content.replace(stuTogglesOld, stuTogglesNew);

  // 2.11 Update VIDEO_MODE_CONFIG listener in student.html
  const stuBroadcastOld = `      channel.on('broadcast', { event: 'VIDEO_MODE_CONFIG' }, async ({ payload }) => {
        if (!payload) return;
        const targetMode = (payload.videoMode === 'livekit' || payload.videoEngine === 'livekit') ? 'livekit' : 'vdo';
        assignedVideoMode = targetMode;
        currentVideoMode = targetMode;
        if (payload.vdoRoom) currentVDORoomName = payload.vdoRoom;
        if (payload.jitsiRoomName) currentVDORoomName = payload.jitsiRoomName;
        console.log('[ELT Live] Modo de video transmitido por Host:', targetMode, 'VDO Room:', currentVDORoomName, '(Admitido:', isAdmittedToClass, ')');
        // NO ingresar al aula; solo actualizar el motor si el estudiante ya está formalmente dentro
        if (isAdmittedToClass) {
          await startStudentVideoEngine(targetMode);
        }
      });`;

  const stuBroadcastNew = `      channel.on('broadcast', { event: 'VIDEO_MODE_CONFIG' }, async ({ payload }) => {
        if (!payload) return;
        const targetMode = (payload.videoMode === 'livekit' || payload.videoEngine === 'livekit') ? 'livekit' : 'p2p';
        assignedVideoMode = targetMode;
        currentVideoMode = targetMode;
        console.log('[ELT Live] Modo de video transmitido por Host:', targetMode, '(Admitido:', isAdmittedToClass, ')');
        // NO ingresar al aula; solo actualizar el motor si el estudiante ya está formalmente dentro
        if (isAdmittedToClass) {
          await startStudentVideoEngine(targetMode);
        }
      });`;

  if (!content.includes(stuBroadcastOld)) {
    throw new Error('Student VIDEO_MODE_CONFIG match failed');
  }
  content = content.replace(stuBroadcastOld, stuBroadcastNew);

  // 2.12 Remove toggleJitsiExpandedSize from window in student.html
  content = content.replace(
    /\s*window\.toggleJitsiExpandedSize = function\(\) \{[\s\S]*?\};\s*/,
    '\n'
  );

  // Remove #btnToggleExpandJitsi from drag checks
  content = content.replace(
    /, #btnToggleExpandJitsi/g,
    ''
  );

  if (isCrlf) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync('ELT LIVE WEB/student.html', content, 'utf8');
  fs.writeFileSync('ELT LIVE WEB/index.html', content, 'utf8');
  fs.writeFileSync('student.html', content, 'utf8');
  console.log('Successfully restored native cards in ELT LIVE WEB/student.html, ELT LIVE WEB/index.html, and student.html');
}

updateHost();
updateStudent();

