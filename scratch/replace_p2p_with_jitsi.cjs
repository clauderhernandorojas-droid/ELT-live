const fs = require('fs');
const path = require('path');

const hostPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/host.html');
const studentPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/ELT LIVE WEB/student.html');
const indexPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/ELT LIVE WEB/index.html');
const rootStudentPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/student.html');

console.log('Reading host.html and student.html...');
let hostContent = fs.readFileSync(hostPath, 'utf8');
let studentContent = fs.readFileSync(studentPath, 'utf8');

const hostHadCRLF = hostContent.includes('\r\n');
const studentHadCRLF = studentContent.includes('\r\n');
hostContent = hostContent.replace(/\r\n/g, '\n');
studentContent = studentContent.replace(/\r\n/g, '\n');

// =========================================================================
// 1. ACTUALIZAR host.html
// =========================================================================

// 1.1 Renombrar botones del selector en host.html
const hostBtn1Target = `          <button id="btnVideoModeP2P" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-emerald-600 text-white shadow-xs" title="Modo 1-a-1: WebRTC P2P directo ilimitado y gratis (sin consumir cuota de LiveKit)">
            <i class="fa-solid fa-user text-[11px]"></i>
            <span>1-a-1 (P2P Gratis)</span>
          </button>`;

const hostBtn1Replacement = `          <button id="btnVideoModeP2P" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-emerald-600 text-white shadow-xs" title="Modo Gratis: Jitsi Meet SFU comunitario ilimitado y gratis (sin cuota)">
            <i class="fa-solid fa-users text-[11px]"></i>
            <span>Gratis (Jitsi SFU)</span>
          </button>`;

if (hostContent.includes(hostBtn1Target)) {
  hostContent = hostContent.replace(hostBtn1Target, hostBtn1Replacement);
}

const hostHeaderBtnTarget = `        <button id="headerBtnVideoModeP2P" type="button" class="px-2 py-1 rounded text-[10px] font-bold transition bg-emerald-600 text-white" title="Modo 1-a-1 P2P Gratis Ilimitado">
          <i class="fa-solid fa-user text-[9px] mr-1"></i>1-a-1 P2P
        </button>`;

const hostHeaderBtnReplacement = `        <button id="headerBtnVideoModeP2P" type="button" class="px-2 py-1 rounded text-[10px] font-bold transition bg-emerald-600 text-white" title="Modo Gratis Jitsi SFU Ilimitado">
          <i class="fa-solid fa-users text-[9px] mr-1"></i>Gratis (Jitsi SFU)
        </button>`;

if (hostContent.includes(hostHeaderBtnTarget)) {
  hostContent = hostContent.replace(hostHeaderBtnTarget, hostHeaderBtnReplacement);
}

// 1.2 Insertar #jitsiDockContainer dentro de #webrtcStripExpandedBody en host.html
const hostStripBodyTarget = `        <!-- Vista Expandida Normal (Miniaturas de Video) -->
        <div id="webrtcStripExpandedBody" class="relative flex items-center gap-2 overflow-x-auto pr-5">
          <!-- Miniatura Local (Host) -->`;

const hostStripBodyReplacement = `        <!-- Vista Expandida Normal (Miniaturas de Video) -->
        <div id="webrtcStripExpandedBody" class="relative flex items-center gap-2 overflow-x-auto pr-5">
          <!-- Contenedor Jitsi Meet SFU embebido (Modo Gratis) -->
          <div id="jitsiDockContainer" class="w-80 h-48 md:w-96 md:h-56 rounded-xl overflow-hidden bg-black flex-shrink-0 hidden"></div>
          <!-- Miniatura Local (Host) -->`;

if (hostContent.includes(hostStripBodyTarget)) {
  hostContent = hostContent.replace(hostStripBodyTarget, hostStripBodyReplacement);
}

// 1.3 Actualizar variables y funciones de modo de video en host.html
const hostVideoModeSectionTarget = `    // ==================== ARQUITECTURA DUAL DE VIDEO: P2P GRATIS ILIMITADO / LIVEKIT SFU ====================
    let currentVideoMode = localStorage.getItem('elt_host_video_mode') || 'p2p';

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
      const isP2P = currentVideoMode === 'p2p';

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
      const targetMode = mode || currentVideoMode;
      roomChannel.send({
        type: 'broadcast',
        event: 'VIDEO_MODE_CONFIG',
        payload: {
          videoMode: targetMode,
          roomPin: roomPin
        }
      });
    }

    document.getElementById('btnVideoModeP2P')?.addEventListener('click', () => setHostVideoMode('p2p'));
    document.getElementById('btnVideoModeLiveKit')?.addEventListener('click', () => setHostVideoMode('livekit'));
    document.getElementById('headerBtnVideoModeP2P')?.addEventListener('click', () => setHostVideoMode('p2p'));
    document.getElementById('headerBtnVideoModeLiveKit')?.addEventListener('click', () => setHostVideoMode('livekit'));`;

const hostVideoModeSectionReplacement = `    // ==================== ARQUITECTURA DUAL DE VIDEO: JITSI SFU GRATIS / LIVEKIT SFU ====================
    let rawStoredMode = localStorage.getItem('elt_host_video_mode');
    let currentVideoMode = (rawStoredMode === 'livekit') ? 'livekit' : 'jitsi';
    let currentJitsiRoomName = null;
    const JITSI_COMMUNITY_DOMAIN = 'meet.ffmuc.net';
    let jitsiScriptLoaded = false;
    let jitsiApiInstance = null;

    function getOrCreateJitsiRoomName() {
      if (!currentJitsiRoomName) {
        const pin = roomPin || '0000';
        currentJitsiRoomName = 'ELTLive_' + pin + '_' + Math.random().toString(36).substring(2, 8);
      }
      return currentJitsiRoomName;
    }

    async function loadJitsiScript() {
      if (window.JitsiMeetExternalAPI) return true;
      if (jitsiScriptLoaded) return true;

      return new Promise((resolve) => {
        const s1 = document.createElement('script');
        s1.src = 'https://' + JITSI_COMMUNITY_DOMAIN + '/external_api.js';
        s1.async = true;
        s1.onload = () => { jitsiScriptLoaded = true; resolve(true); };
        s1.onerror = () => {
          console.warn('[Jitsi] Falló external_api.js en ' + JITSI_COMMUNITY_DOMAIN + ', intentando meet.jit.si...');
          s1.remove();
          const s2 = document.createElement('script');
          s2.src = 'https://meet.jit.si/external_api.js';
          s2.async = true;
          s2.onload = () => { jitsiScriptLoaded = true; resolve(true); };
          s2.onerror = () => {
            console.error('[Jitsi] No se pudo cargar external_api.js desde ningún servidor.');
            resolve(false);
          };
          document.head.appendChild(s2);
        };
        document.head.appendChild(s1);
      });
    }

    async function mountJitsiMeet(containerEl, roomName, displayName, domain = JITSI_COMMUNITY_DOMAIN) {
      if (!containerEl || !roomName) return null;
      if (jitsiApiInstance) {
        try { jitsiApiInstance.dispose(); } catch (e) {}
        jitsiApiInstance = null;
      }

      containerEl.innerHTML = '';
      const scriptOk = await loadJitsiScript();

      if (scriptOk && window.JitsiMeetExternalAPI) {
        try {
          const options = {
            roomName: roomName,
            width: '100%',
            height: '100%',
            parentNode: containerEl,
            userInfo: {
              displayName: displayName || 'Profesor (Host)'
            },
            configOverwrite: {
              prejoinPageEnabled: false,
              startWithAudioMuted: true,
              startWithVideoMuted: true,
              disableDeepLinking: true,
              resolution: 360,
              constraints: {
                video: {
                  height: { ideal: 360, max: 360 }
                }
              }
            },
            interfaceConfigOverwrite: {
              SHOW_JITSI_WATERMARK: false,
              SHOW_WATERMARK_FOR_GUESTS: false,
              MOBILE_APP_PROMO: false,
              TOOLBAR_BUTTONS: ['microphone', 'camera', 'tileview', 'fullscreen']
            }
          };

          jitsiApiInstance = new window.JitsiMeetExternalAPI(domain, options);
          return jitsiApiInstance;
        } catch (apiErr) {
          console.warn('[Jitsi] Error instanciando JitsiMeetExternalAPI, usando iframe directo:', apiErr);
        }
      }

      // Fallback a iframe directo si el script fue bloqueado
      const iframeUrl = \`https://\${domain}/\${encodeURIComponent(roomName)}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=true&userInfo.displayName=\${encodeURIComponent(displayName || 'Profesor (Host)')}\`;
      const iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.setAttribute('allow', 'camera; microphone; fullscreen; display-capture; autoplay');
      containerEl.appendChild(iframe);
      return null;
    }

    function setHostVideoMode(mode) {
      currentVideoMode = (mode === 'livekit') ? 'livekit' : 'jitsi';
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
      const isJitsi = (currentVideoMode === 'jitsi' || currentVideoMode === 'p2p');

      const btnP2P = document.getElementById('btnVideoModeP2P');
      const btnLK = document.getElementById('btnVideoModeLiveKit');
      if (btnP2P && btnLK) {
        btnP2P.className = isJitsi
          ? 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-emerald-600 text-white shadow-xs'
          : 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white';
        btnLK.className = !isJitsi
          ? 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-indigo-600 text-white shadow-xs'
          : 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white';
      }

      const hBtnP2P = document.getElementById('headerBtnVideoModeP2P');
      const hBtnLK = document.getElementById('headerBtnVideoModeLiveKit');
      if (hBtnP2P && hBtnLK) {
        hBtnP2P.className = isJitsi
          ? 'px-2 py-1 rounded text-[10px] font-bold transition bg-emerald-600 text-white'
          : 'px-2 py-1 rounded text-[10px] font-bold transition text-slate-400 hover:text-white';
        hBtnLK.className = !isJitsi
          ? 'px-2 py-1 rounded text-[10px] font-bold transition bg-indigo-600 text-white'
          : 'px-2 py-1 rounded text-[10px] font-bold transition text-slate-400 hover:text-white';
      }
    }

    function broadcastVideoModeConfig(mode) {
      if (!roomChannel) return;
      const targetMode = mode || currentVideoMode;
      const jRoom = getOrCreateJitsiRoomName();
      roomChannel.send({
        type: 'broadcast',
        event: 'VIDEO_MODE_CONFIG',
        payload: {
          videoMode: targetMode,
          videoEngine: targetMode,
          jitsiRoomName: jRoom,
          jitsiDomain: JITSI_COMMUNITY_DOMAIN,
          roomPin: roomPin
        }
      });
    }

    document.getElementById('btnVideoModeP2P')?.addEventListener('click', () => setHostVideoMode('jitsi'));
    document.getElementById('btnVideoModeLiveKit')?.addEventListener('click', () => setHostVideoMode('livekit'));
    document.getElementById('headerBtnVideoModeP2P')?.addEventListener('click', () => setHostVideoMode('jitsi'));
    document.getElementById('headerBtnVideoModeLiveKit')?.addEventListener('click', () => setHostVideoMode('livekit'));`;

if (hostContent.includes(hostVideoModeSectionTarget)) {
  hostContent = hostContent.replace(hostVideoModeSectionTarget, hostVideoModeSectionReplacement);
}

// 1.4 Actualizar startHostVideoEngine en host.html
const hostStartEngineTarget = `    async function startHostVideoEngine(mode) {
      console.log('[ELT Live] Inicializando motor de video Host:', mode);
      if (mode === 'livekit') {
        closeAllP2PConnections();
        if (p2pLocalStream) {
          p2pLocalStream.getTracks().forEach(t => t.stop());
          p2pLocalStream = null;
        }
        if (roomPin) {
          await connectLiveKit(roomPin, 'Profesor (Host)', true);
        }
      } else {
        // Modo P2P directo
        if (livekitRoom) {
          try { await livekitRoom.disconnect(); } catch (e) {}
          livekitRoom = null;
        }
        if (webrtcAudioEnabled || webrtcVideoEnabled) {
          await ensureP2PLocalStream(webrtcAudioEnabled, webrtcVideoEnabled);
        }
        announceWebRTCPresence();
      }
      updateLocalMediaButtonsUI();
    }`;

const hostStartEngineReplacement = `    async function startHostVideoEngine(mode) {
      const targetMode = (mode === 'livekit') ? 'livekit' : 'jitsi';
      currentVideoMode = targetMode;
      console.log('[ELT Live] Inicializando motor de video Host:', targetMode);

      const jitsiContainer = document.getElementById('jitsiDockContainer');
      const localCard = document.getElementById('webrtcLocalCard');
      const remoteCards = document.getElementById('webrtcRemoteCards');

      if (targetMode === 'livekit') {
        if (jitsiApiInstance) {
          try { jitsiApiInstance.dispose(); } catch (e) {}
          jitsiApiInstance = null;
        }
        if (jitsiContainer) {
          jitsiContainer.classList.add('hidden');
          jitsiContainer.innerHTML = '';
        }
        if (localCard) localCard.classList.remove('hidden');
        if (remoteCards) remoteCards.classList.remove('hidden');

        if (roomPin) {
          await connectLiveKit(roomPin, 'Profesor (Host)', true);
        }
      } else {
        // Modo Gratis Jitsi SFU (meet.ffmuc.net)
        if (livekitRoom) {
          try { await livekitRoom.disconnect(); } catch (e) {}
          livekitRoom = null;
        }
        if (localCard) localCard.classList.add('hidden');
        if (remoteCards) remoteCards.classList.add('hidden');

        if (jitsiContainer) {
          jitsiContainer.classList.remove('hidden');
          const jRoom = getOrCreateJitsiRoomName();
          await mountJitsiMeet(jitsiContainer, jRoom, 'Profesor (Host)', JITSI_COMMUNITY_DOMAIN);
        }
      }
      updateLocalMediaButtonsUI();
    }`;

if (hostContent.includes(hostStartEngineTarget)) {
  hostContent = hostContent.replace(hostStartEngineTarget, hostStartEngineReplacement);
}

// 1.5 En host.html: Conectar toggleLocalAudio y toggleLocalVideo con jitsiApiInstance
const hostToggleAudioTarget = `    async function toggleLocalAudio() {
      webrtcAudioEnabled = !webrtcAudioEnabled;
      if (currentVideoMode === 'livekit' && livekitRoom) {
        try {
          await livekitRoom.localParticipant.setMicrophoneEnabled(webrtcAudioEnabled);
        } catch (err) {
          console.warn('[LiveKit] Error alternando micrófono:', err);
          webrtcAudioEnabled = !webrtcAudioEnabled;
        }
      } else if (currentVideoMode === 'p2p') {
        if (!p2pLocalStream && webrtcAudioEnabled) {
          await ensureP2PLocalStream(true, webrtcVideoEnabled);
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
        if (!p2pLocalStream && webrtcVideoEnabled) {
          await ensureP2PLocalStream(webrtcAudioEnabled, true);
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

const hostToggleAudioReplacement = `    async function toggleLocalAudio() {
      webrtcAudioEnabled = !webrtcAudioEnabled;
      if (currentVideoMode === 'livekit' && livekitRoom) {
        try {
          await livekitRoom.localParticipant.setMicrophoneEnabled(webrtcAudioEnabled);
        } catch (err) {
          console.warn('[LiveKit] Error alternando micrófono:', err);
          webrtcAudioEnabled = !webrtcAudioEnabled;
        }
      } else if (currentVideoMode === 'jitsi' || currentVideoMode === 'p2p') {
        if (jitsiApiInstance) {
          try { jitsiApiInstance.executeCommand('toggleAudio'); } catch (e) {}
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
      } else if (currentVideoMode === 'jitsi' || currentVideoMode === 'p2p') {
        if (jitsiApiInstance) {
          try { jitsiApiInstance.executeCommand('toggleVideo'); } catch (e) {}
        }
      }
      updateLocalMediaButtonsUI();
      broadcastWebRTCMediaState();
    }`;

if (hostContent.includes(hostToggleAudioTarget)) {
  hostContent = hostContent.replace(hostToggleAudioTarget, hostToggleAudioReplacement);
}

// 1.6 Desactivar creación de RTCPeerConnection en getOrCreateP2PPeerConnection en host.html
const hostGetOrCreateTarget = `    function getOrCreateP2PPeerConnection(remotePeerId, remoteName) {
      if (webrtcPeers[remotePeerId] && webrtcPeers[remotePeerId].pc) {`;

const hostGetOrCreateReplacement = `    function getOrCreateP2PPeerConnection(remotePeerId, remoteName) {
      // P2P desactivado en favor de Jitsi SFU y LiveKit SFU
      return null;
      if (webrtcPeers[remotePeerId] && webrtcPeers[remotePeerId].pc) {`;

if (hostContent.includes(hostGetOrCreateTarget)) {
  hostContent = hostContent.replace(hostGetOrCreateTarget, hostGetOrCreateReplacement);
}

// 1.7 En host.html: emitir jitsiRoomName en WAITING_ROOM_ADMIT y en track de presencia
hostContent = hostContent.replace(
  `        payload: {\n          studentId: studentId,\n          studentName: st.name,\n          videoMode: currentVideoMode\n        }`,
  `        payload: {\n          studentId: studentId,\n          studentName: st.name,\n          videoMode: currentVideoMode,\n          videoEngine: currentVideoMode,\n          jitsiRoomName: getOrCreateJitsiRoomName(),\n          jitsiDomain: JITSI_COMMUNITY_DOMAIN\n        }`
);

hostContent = hostContent.replace(
  `      document.getElementById('roomPinDisplay').textContent = '#' + roomPin;`,
  `      document.getElementById('roomPinDisplay').textContent = '#' + roomPin;\n      currentJitsiRoomName = 'ELTLive_' + roomPin + '_' + Math.random().toString(36).substring(2, 8);`
);

hostContent = hostContent.replace(
  `            name: 'Profesor (Host)',\n            role: 'host',\n            videoMode: currentVideoMode,\n            peerId: webrtcMyPeerId,`,
  `            name: 'Profesor (Host)',\n            role: 'host',\n            videoMode: currentVideoMode,\n            videoEngine: currentVideoMode,\n            jitsiRoomName: getOrCreateJitsiRoomName(),\n            jitsiDomain: JITSI_COMMUNITY_DOMAIN,\n            peerId: webrtcMyPeerId,`
);


// =========================================================================
// 2. ACTUALIZAR ELT LIVE WEB/student.html
// =========================================================================

// 2.1 Insertar #jitsiDockContainer dentro de #webrtcStripExpandedBody en student.html
const studentStripBodyTarget = `          <!-- Indicador de arrastre lateral + Cuerpo Expandido de Cámaras -->
          <div id="webrtcStripExpandedBody" class="flex items-center gap-2 overflow-x-auto">
            <div id="webrtcDragHandle" class="flex flex-col items-center justify-center px-1 py-2 text-slate-500 hover:text-slate-300 cursor-move shrink-0" title="Arrastrar cámaras">
              <i class="fa-solid fa-grip-vertical text-xs"></i>
            </div>
            <!-- Miniatura Local (Estudiante) -->`;

const studentStripBodyReplacement = `          <!-- Indicador de arrastre lateral + Cuerpo Expandido de Cámaras -->
          <div id="webrtcStripExpandedBody" class="flex items-center gap-2 overflow-x-auto">
            <div id="webrtcDragHandle" class="flex flex-col items-center justify-center px-1 py-2 text-slate-500 hover:text-slate-300 cursor-move shrink-0" title="Arrastrar cámaras">
              <i class="fa-solid fa-grip-vertical text-xs"></i>
            </div>
            <!-- Contenedor Jitsi Meet SFU embebido (Modo Gratis) -->
            <div id="jitsiDockContainer" class="w-72 h-44 sm:w-80 sm:h-48 rounded-xl overflow-hidden bg-black flex-shrink-0 hidden"></div>
            <!-- Miniatura Local (Estudiante) -->`;

if (studentContent.includes(studentStripBodyTarget)) {
  studentContent = studentContent.replace(studentStripBodyTarget, studentStripBodyReplacement);
}

// 2.2 Variables globales y loader de Jitsi en student.html
const studentLiveKitVarsTarget = `    // Estados de Conexión LiveKit Cloud SFU
    let livekitRoom = null;
    let livekitUrl = null;
    let livekitToken = null;
    let isConnectingLiveKit = false;`;

const studentLiveKitVarsReplacement = `    // Estados de Conexión LiveKit Cloud SFU y Jitsi SFU
    let livekitRoom = null;
    let livekitUrl = null;
    let livekitToken = null;
    let isConnectingLiveKit = false;

    let currentJitsiRoomName = null;
    let currentJitsiDomain = 'meet.ffmuc.net';
    let jitsiScriptLoaded = false;
    let jitsiApiInstance = null;

    async function loadJitsiScript() {
      if (window.JitsiMeetExternalAPI) return true;
      if (jitsiScriptLoaded) return true;

      return new Promise((resolve) => {
        const s1 = document.createElement('script');
        s1.src = 'https://' + currentJitsiDomain + '/external_api.js';
        s1.async = true;
        s1.onload = () => { jitsiScriptLoaded = true; resolve(true); };
        s1.onerror = () => {
          console.warn('[Jitsi] Falló external_api.js en ' + currentJitsiDomain + ', intentando meet.jit.si...');
          s1.remove();
          const s2 = document.createElement('script');
          s2.src = 'https://meet.jit.si/external_api.js';
          s2.async = true;
          s2.onload = () => { jitsiScriptLoaded = true; resolve(true); };
          s2.onerror = () => {
            console.error('[Jitsi] No se pudo cargar external_api.js.');
            resolve(false);
          };
          document.head.appendChild(s2);
        };
        document.head.appendChild(s1);
      });
    }

    async function mountJitsiMeet(containerEl, roomName, displayName, domain = currentJitsiDomain) {
      if (!containerEl || !roomName) return null;
      if (jitsiApiInstance) {
        try { jitsiApiInstance.dispose(); } catch (e) {}
        jitsiApiInstance = null;
      }

      containerEl.innerHTML = '';
      const scriptOk = await loadJitsiScript();

      if (scriptOk && window.JitsiMeetExternalAPI) {
        try {
          const options = {
            roomName: roomName,
            width: '100%',
            height: '100%',
            parentNode: containerEl,
            userInfo: {
              displayName: displayName || 'Alumno'
            },
            configOverwrite: {
              prejoinPageEnabled: false,
              startWithAudioMuted: true,
              startWithVideoMuted: true,
              disableDeepLinking: true,
              resolution: 360,
              constraints: {
                video: {
                  height: { ideal: 360, max: 360 }
                }
              }
            },
            interfaceConfigOverwrite: {
              SHOW_JITSI_WATERMARK: false,
              SHOW_WATERMARK_FOR_GUESTS: false,
              MOBILE_APP_PROMO: false,
              TOOLBAR_BUTTONS: ['microphone', 'camera', 'tileview', 'fullscreen']
            }
          };

          jitsiApiInstance = new window.JitsiMeetExternalAPI(domain, options);
          return jitsiApiInstance;
        } catch (apiErr) {
          console.warn('[Jitsi] Error al instanciar JitsiMeetExternalAPI en Estudiante:', apiErr);
        }
      }

      // Fallback a iframe directo si la API JS fue bloqueada
      const iframeUrl = \`https://\${domain}/\${encodeURIComponent(roomName)}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=true&userInfo.displayName=\${encodeURIComponent(displayName || 'Alumno')}\`;
      const iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.setAttribute('allow', 'camera; microphone; fullscreen; display-capture; autoplay');
      containerEl.appendChild(iframe);
      return null;
    }`;

if (studentContent.includes(studentLiveKitVarsTarget)) {
  studentContent = studentContent.replace(studentLiveKitVarsTarget, studentLiveKitVarsReplacement);
}

// 2.3 startStudentVideoEngine en student.html con RETENCIÓN ESTRICTA EN SALA DE ESPERA
const studentStartEngineTarget = `    async function startStudentVideoEngine(mode) {
      const targetMode = (mode === 'livekit') ? 'livekit' : 'p2p';
      assignedVideoMode = targetMode;
      currentVideoMode = targetMode;

      // PROHIBIDO iniciar motor de video, LiveKit o P2P mientras no esté admitido por el profesor
      if (!isAdmittedToClass) {
        console.log('[ELT Live] Modo de video configurado a', targetMode, '— retenido hasta aprobación del profesor.');
        return;
      }

      console.log('[ELT Live] Inicializando motor de video Estudiante:', targetMode);

      if (targetMode === 'livekit') {
        closeAllP2PConnections();
        if (p2pLocalStream) {
          p2pLocalStream.getTracks().forEach(t => t.stop());
          p2pLocalStream = null;
        }
        if (currentRoomPin) {
          await connectLiveKit(currentRoomPin, myName, false);
        }
      } else {
        // Modo P2P directo
        if (livekitRoom) {
          try { await livekitRoom.disconnect(); } catch (e) {}
          livekitRoom = null;
        }
        if (webrtcAudioEnabled || webrtcVideoEnabled) {
          await ensureP2PLocalStream(webrtcAudioEnabled, webrtcVideoEnabled);
        }
        announceWebRTCPresence();
      }
      updateLocalMediaUI();
    }`;

const studentStartEngineReplacement = `    async function startStudentVideoEngine(mode) {
      const targetMode = (mode === 'livekit') ? 'livekit' : 'jitsi';
      assignedVideoMode = targetMode;
      currentVideoMode = targetMode;

      // PROHIBIDO iniciar motor de video o conectar Jitsi mientras el estudiante esté en Sala de Espera
      if (!isAdmittedToClass) {
        console.log('[ELT Live] Modo de video configurado a', targetMode, '— retenido en Sala de Espera hasta aprobación del profesor.');
        return;
      }

      console.log('[ELT Live] Inicializando motor de video Estudiante:', targetMode, '(Admitido:', isAdmittedToClass, ')');

      const jitsiContainer = document.getElementById('jitsiDockContainer');
      const localCard = document.getElementById('webrtcLocalCard');
      const remoteCards = document.getElementById('webrtcRemoteCards');

      if (targetMode === 'livekit') {
        if (jitsiApiInstance) {
          try { jitsiApiInstance.dispose(); } catch (e) {}
          jitsiApiInstance = null;
        }
        if (jitsiContainer) {
          jitsiContainer.classList.add('hidden');
          jitsiContainer.innerHTML = '';
        }
        if (localCard) localCard.classList.remove('hidden');
        if (remoteCards) remoteCards.classList.remove('hidden');

        if (currentRoomPin) {
          await connectLiveKit(currentRoomPin, myName || 'Alumno', false);
        }
      } else {
        // Modo Gratis Jitsi SFU (meet.ffmuc.net)
        if (livekitRoom) {
          try { await livekitRoom.disconnect(); } catch (e) {}
          livekitRoom = null;
        }
        if (localCard) localCard.classList.add('hidden');
        if (remoteCards) remoteCards.classList.add('hidden');

        if (jitsiContainer) {
          jitsiContainer.classList.remove('hidden');
          const jRoom = currentJitsiRoomName || ('ELTLive_' + (currentRoomPin || '0000') + '_session');
          await mountJitsiMeet(jitsiContainer, jRoom, myName || 'Alumno', currentJitsiDomain || 'meet.ffmuc.net');
        }
      }
      updateLocalMediaUI();
    }`;

if (!studentContent.includes(studentStartEngineTarget)) {
  console.error('Could not find startStudentVideoEngine in student.html');
  process.exit(1);
}
studentContent = studentContent.replace(studentStartEngineTarget, studentStartEngineReplacement);

// 2.4 Actualizar toggleLocalAudio y toggleLocalVideo en student.html
const studentToggleAudioTarget = `    async function toggleLocalAudio() {
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
          if (!p2pLocalStream && webrtcAudioEnabled) {
            await ensureP2PLocalStream(true, webrtcVideoEnabled);
          }
          if (p2pLocalStream) {
            p2pLocalStream.getAudioTracks().forEach(t => { t.enabled = webrtcAudioEnabled; });
          }
          await syncP2PTracksToAllPeers();
        } catch (err) {
          console.error('[P2P] Error al alternar micrófono P2P:', err);
          webrtcAudioEnabled = !webrtcAudioEnabled;
          showMediaAlert('Error al acceder al micrófono: ' + (err.message || err.name || err));
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

const studentToggleAudioReplacement = `    async function toggleLocalAudio() {
      webrtcAudioEnabled = !webrtcAudioEnabled;
      if (currentVideoMode === 'livekit' && livekitRoom) {
        try {
          await livekitRoom.localParticipant.setMicrophoneEnabled(webrtcAudioEnabled);
        } catch (err) {
          console.error('[LiveKit] Error al alternar micrófono en Estudiante:', err);
          webrtcAudioEnabled = !webrtcAudioEnabled;
          showMediaAlert('No se pudo acceder al micrófono: ' + (err.message || err.name || err));
        }
      } else if (currentVideoMode === 'jitsi' || currentVideoMode === 'p2p') {
        if (jitsiApiInstance) {
          try { jitsiApiInstance.executeCommand('toggleAudio'); } catch (e) {}
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
        } else if (currentVideoMode === 'jitsi' || currentVideoMode === 'p2p') {
          if (jitsiApiInstance) {
            try { jitsiApiInstance.executeCommand('toggleVideo'); } catch (e) {}
          }
        }
      } catch (fatalCamErr) {
        console.error('[toggleLocalVideo] Error atrapado y blindado:', fatalCamErr);
      } finally {
        try { updateLocalMediaUI(); } catch (e) {}
        try { broadcastWebRTCMediaState(); } catch (e) {}
      }
    }`;

if (studentContent.includes(studentToggleAudioTarget)) {
  studentContent = studentContent.replace(studentToggleAudioTarget, studentToggleAudioReplacement);
}

// 2.5 En student.html: Desactivar creación de RTCPeerConnection en getOrCreateP2PPeerConnection
const studentGetOrCreateTarget = `    function getOrCreateP2PPeerConnection(remotePeerId, remoteName, remoteRole) {
      if (webrtcPeers[remotePeerId] && webrtcPeers[remotePeerId].pc) {`;

const studentGetOrCreateReplacement = `    function getOrCreateP2PPeerConnection(remotePeerId, remoteName, remoteRole) {
      // P2P desactivado en favor de Jitsi SFU y LiveKit SFU
      return null;
      if (webrtcPeers[remotePeerId] && webrtcPeers[remotePeerId].pc) {`;

if (studentContent.includes(studentGetOrCreateTarget)) {
  studentContent = studentContent.replace(studentGetOrCreateTarget, studentGetOrCreateReplacement);
}

// 2.6 En student.html: En leaveStudentSession, desechar jitsiApiInstance y limpiar jitsiDockContainer
const studentLeaveSessionTarget = `      // 3. Desconectar y liberar completamente LiveKit Cloud SFU
      if (livekitRoom) {
        try {
          await livekitRoom.disconnect();
        } catch (lkErr) {
          console.warn('[LiveKit] Error durante desconexión:', lkErr);
        }
        livekitRoom = null;
      }`;

const studentLeaveSessionReplacement = `      // 3. Desconectar y liberar completamente Jitsi SFU y LiveKit Cloud SFU
      if (jitsiApiInstance) {
        try { jitsiApiInstance.dispose(); } catch (jErr) {}
        jitsiApiInstance = null;
      }
      const jitsiContainer = document.getElementById('jitsiDockContainer');
      if (jitsiContainer) {
        jitsiContainer.classList.add('hidden');
        jitsiContainer.innerHTML = '';
      }

      if (livekitRoom) {
        try {
          await livekitRoom.disconnect();
        } catch (lkErr) {
          console.warn('[LiveKit] Error durante desconexión:', lkErr);
        }
        livekitRoom = null;
      }`;

if (studentContent.includes(studentLeaveSessionTarget)) {
  studentContent = studentContent.replace(studentLeaveSessionTarget, studentLeaveSessionReplacement);
}

// 2.7 En student.html: Escuchar jitsiRoomName y jitsiDomain en VIDEO_MODE_CONFIG y WAITING_ROOM_ADMIT
const studentConfigTarget = `      channel.on('broadcast', { event: 'VIDEO_MODE_CONFIG' }, async ({ payload }) => {
        if (!payload || !payload.videoMode) return;
        const targetMode = payload.videoMode === 'livekit' ? 'livekit' : 'p2p';
        assignedVideoMode = targetMode;
        currentVideoMode = targetMode;
        console.log('[ELT Live] Modo de video transmitido por Host:', targetMode, '(Admitido:', isAdmittedToClass, ')');
        // NO ingresar al aula; solo actualizar el motor si el estudiante ya está formalmente dentro
        if (isAdmittedToClass) {
          await startStudentVideoEngine(targetMode);
        }
      });`;

const studentConfigReplacement = `      channel.on('broadcast', { event: 'VIDEO_MODE_CONFIG' }, async ({ payload }) => {
        if (!payload) return;
        const targetMode = (payload.videoMode === 'livekit' || payload.videoEngine === 'livekit') ? 'livekit' : 'jitsi';
        assignedVideoMode = targetMode;
        currentVideoMode = targetMode;
        if (payload.jitsiRoomName) currentJitsiRoomName = payload.jitsiRoomName;
        if (payload.jitsiDomain) currentJitsiDomain = payload.jitsiDomain;
        console.log('[ELT Live] Modo de video transmitido por Host:', targetMode, 'Jitsi Room:', currentJitsiRoomName, '(Admitido:', isAdmittedToClass, ')');
        // NO ingresar al aula; solo actualizar el motor si el estudiante ya está formalmente dentro
        if (isAdmittedToClass) {
          await startStudentVideoEngine(targetMode);
        }
      });`;

if (studentContent.includes(studentConfigTarget)) {
  studentContent = studentContent.replace(studentConfigTarget, studentConfigReplacement);
}

// En WAITING_ROOM_ADMIT de student.html
const studentWaitingAdmitTarget = `        if (!isAdmittedToClass) {
          // Admitir solo si coincide con el studentId o studentName de este alumno
          if ((targetId && targetId === myStudentId) || (targetName && targetName === currentName)) {
            if (payload.videoMode) assignedVideoMode = payload.videoMode;
            playGentleNotificationBeep();
            admitStudentToClass();
          }
        }`;

const studentWaitingAdmitReplacement = `        if (payload.jitsiRoomName) currentJitsiRoomName = payload.jitsiRoomName;
        if (payload.jitsiDomain) currentJitsiDomain = payload.jitsiDomain;

        if (!isAdmittedToClass) {
          // Admitir solo si coincide con el studentId o studentName de este alumno
          if ((targetId && targetId === myStudentId) || (targetName && targetName === currentName)) {
            if (payload.videoMode || payload.videoEngine) {
              assignedVideoMode = (payload.videoMode === 'livekit' || payload.videoEngine === 'livekit') ? 'livekit' : 'jitsi';
            }
            playGentleNotificationBeep();
            admitStudentToClass();
          }
        }`;

if (studentContent.includes(studentWaitingAdmitTarget)) {
  studentContent = studentContent.replace(studentWaitingAdmitTarget, studentWaitingAdmitReplacement);
}

// En presence sync de student.html: leer jitsiRoomName del Host
const studentPresenceHostTarget = `          if (key === 'host' || u.role === 'host') {
            if (u.videoMode && u.videoMode !== currentVideoMode && isAdmittedToClass) {
              if (typeof startStudentVideoEngine === 'function') {
                startStudentVideoEngine(u.videoMode);
              }
            }`;

const studentPresenceHostReplacement = `          if (key === 'host' || u.role === 'host') {
            if (u.jitsiRoomName) currentJitsiRoomName = u.jitsiRoomName;
            if (u.jitsiDomain) currentJitsiDomain = u.jitsiDomain;
            const hMode = (u.videoMode === 'livekit' || u.videoEngine === 'livekit') ? 'livekit' : 'jitsi';
            if (hMode !== currentVideoMode && isAdmittedToClass) {
              if (typeof startStudentVideoEngine === 'function') {
                startStudentVideoEngine(hMode);
              }
            }`;

if (studentContent.includes(studentPresenceHostTarget)) {
  studentContent = studentContent.replace(studentPresenceHostTarget, studentPresenceHostReplacement);
}

// Restaurar finales de línea
if (hostHadCRLF) hostContent = hostContent.replace(/\n/g, '\r\n');
if (studentHadCRLF) studentContent = studentContent.replace(/\n/g, '\r\n');

// Guardar archivos
fs.writeFileSync(hostPath, hostContent, 'utf8');
fs.writeFileSync(studentPath, studentContent, 'utf8');
fs.writeFileSync(indexPath, studentContent, 'utf8');
fs.writeFileSync(rootStudentPath, studentContent, 'utf8');

console.log('Successfully replaced P2P with Jitsi Meet SFU and synchronized all files!');
