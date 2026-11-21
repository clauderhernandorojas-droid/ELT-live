const fs = require('fs');
const path = require('path');

const hostPath = path.resolve(__dirname, '..', 'host.html');
const studentPath = path.resolve(__dirname, '..', 'ELT LIVE WEB', 'student.html');
const studentIndexPath = path.resolve(__dirname, '..', 'ELT LIVE WEB', 'index.html');
const studentRootPath = path.resolve(__dirname, '..', 'student.html');

let host = fs.readFileSync(hostPath, 'utf8');
let student = fs.readFileSync(studentPath, 'utf8');

const isHostCRLF = host.includes('\r\n');
const isStudentCRLF = student.includes('\r\n');

host = host.replace(/\r\n/g, '\n');
student = student.replace(/\r\n/g, '\n');

console.log('Normalized LF lengths - Host:', host.length, 'Student:', student.length);

// ==========================================
// 1. INCLUIR CDN DAILY-JS EN HEAD
// ==========================================
const dailyCdnTag = '<script crossorigin src="https://unpkg.com/@daily-co/daily-js"></script>';

if (!host.includes('@daily-co/daily-js')) {
  host = host.replace('<script src="https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.umd.min.js"></script>',
    '<script src="https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.umd.min.js"></script>\n  ' + dailyCdnTag);
}

if (!student.includes('@daily-co/daily-js')) {
  student = student.replace('<script src="https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.umd.min.js"></script>',
    '<script src="https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.umd.min.js"></script>\n  ' + dailyCdnTag);
}

// ==========================================
// 2. BOTONES EN HOST.HTML (Barra de Control y Cabecera)
// ==========================================

// A) Barra de Control Principal (#btnVideoModeP2P, #btnVideoModeLiveKit, #btnVideoModeDaily)
const oldMainButtons = `          <button id="btnVideoModeP2P" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-emerald-600 text-white shadow-xs" title="Modo Gratis: WebRTC Nativo con STUN/TURN (sin cuotas)">
            <i class="fa-solid fa-users text-[11px]"></i>
            <span>Gratis (Nativo)</span>
          </button>
          <button id="btnVideoModeLiveKit" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white" title="Modo Grupal: LiveKit Cloud SFU (ideal 3 a 8 alumnos)">
            <i class="fa-solid fa-users text-[11px]"></i>
            <span>Grupal (LiveKit SFU)</span>
          </button>`;

const newMainButtons = `          <button id="btnVideoModeP2P" data-mode="p2p" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-emerald-600 text-white shadow-xs" title="Modo Gratis: WebRTC Nativo con STUN/TURN (sin cuotas)">
            <i class="fa-solid fa-users text-[11px]"></i>
            <span>Gratis (Nativo)</span>
          </button>
          <button id="btnVideoModeLiveKit" data-mode="livekit" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white" title="Modo Grupal: LiveKit Cloud SFU (ideal 3 a 8 alumnos)">
            <i class="fa-solid fa-server text-[11px]"></i>
            <span>LiveKit SFU</span>
          </button>
          <button id="btnVideoModeDaily" data-mode="daily" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white" title="Modo Daily.co SFU Headless (alta calidad y estabilidad)">
            <i class="fa-solid fa-video text-[11px]"></i>
            <span>Daily SFU</span>
          </button>`;

if (!host.includes(oldMainButtons)) {
  console.error('ERROR: oldMainButtons not found in host.html');
  process.exit(1);
}
host = host.replace(oldMainButtons, newMainButtons);

// B) Cabecera Compacta (#headerBtnVideoModeP2P, #headerBtnVideoModeLiveKit, #headerBtnVideoModeDaily)
const oldHeaderButtons = `        <button id="headerBtnVideoModeP2P" type="button" class="px-2 py-1 rounded text-[10px] font-bold transition bg-emerald-600 text-white" title="Modo Gratis: WebRTC Nativo con STUN/TURN">
          <i class="fa-solid fa-users text-[9px] mr-1"></i>Gratis (Nativo)
        </button>
        <button id="headerBtnVideoModeLiveKit" type="button" class="px-2 py-1 rounded text-[10px] font-bold transition text-slate-400 hover:text-white" title="Modo Grupal LiveKit SFU">
          <i class="fa-solid fa-users text-[9px] mr-1"></i>Grupal SFU
        </button>`;

const newHeaderButtons = `        <button id="headerBtnVideoModeP2P" data-mode="p2p" type="button" class="px-2 py-1 rounded text-[10px] font-bold transition bg-emerald-600 text-white" title="Modo Gratis: WebRTC Nativo con STUN/TURN">
          <i class="fa-solid fa-users text-[9px] mr-1"></i>Gratis (Nativo)
        </button>
        <button id="headerBtnVideoModeLiveKit" data-mode="livekit" type="button" class="px-2 py-1 rounded text-[10px] font-bold transition text-slate-400 hover:text-white" title="Modo Grupal LiveKit SFU">
          <i class="fa-solid fa-server text-[9px] mr-1"></i>LiveKit SFU
        </button>
        <button id="headerBtnVideoModeDaily" data-mode="daily" type="button" class="px-2 py-1 rounded text-[10px] font-bold transition text-slate-400 hover:text-white" title="Modo Daily.co SFU">
          <i class="fa-solid fa-video text-[9px] mr-1"></i>Daily SFU
        </button>`;

if (!host.includes(oldHeaderButtons)) {
  console.error('ERROR: oldHeaderButtons not found in host.html');
  process.exit(1);
}
host = host.replace(oldHeaderButtons, newHeaderButtons);

// ==========================================
// 3. LOGICA EN HOST.HTML: CONSTANTES, SELECTOR Y MOTOR DAILY
// ==========================================
const oldHostModeLogic = `    // ==================== ARQUITECTURA DUAL DE VIDEO: WEBRTC NATIVO (P2P) / LIVEKIT SFU ====================
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
    document.getElementById('headerBtnVideoModeLiveKit')?.addEventListener('click', () => setHostVideoMode('livekit'));`;

const newHostModeLogic = `    // ==================== ARQUITECTURA MULTI-MOTOR DE VIDEO: P2P NATIVO / LIVEKIT SFU / DAILY SFU ====================
    const DAILY_DOMAIN = 'elt-live.daily.co';
    const DAILY_API_KEY = '1ebb2aa13450b770c52318d17dacb8e843e7e8f6395276a55f2f415d79ae71ba';
    let dailyCallObject = null;
    let dailyRoomUrl = null;

    let rawStoredMode = localStorage.getItem('elt_host_video_mode');
    let currentVideoMode = (rawStoredMode === 'livekit' || rawStoredMode === 'daily') ? rawStoredMode : 'p2p';

    function setHostVideoMode(mode) {
      currentVideoMode = (mode === 'livekit' || mode === 'daily') ? mode : 'p2p';
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
      const mode = currentVideoMode;
      const btnP2P = document.getElementById('btnVideoModeP2P');
      const btnLK = document.getElementById('btnVideoModeLiveKit');
      const btnDaily = document.getElementById('btnVideoModeDaily');

      const activeCls = 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-white shadow-xs';
      const inactiveCls = 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white';

      if (btnP2P) btnP2P.className = (mode === 'p2p') ? \`\${activeCls} bg-emerald-600\` : inactiveCls;
      if (btnLK) btnLK.className = (mode === 'livekit') ? \`\${activeCls} bg-indigo-600\` : inactiveCls;
      if (btnDaily) btnDaily.className = (mode === 'daily') ? \`\${activeCls} bg-cyan-600\` : inactiveCls;

      const hBtnP2P = document.getElementById('headerBtnVideoModeP2P');
      const hBtnLK = document.getElementById('headerBtnVideoModeLiveKit');
      const hBtnDaily = document.getElementById('headerBtnVideoModeDaily');

      const hActiveCls = 'px-2 py-1 rounded text-[10px] font-bold transition text-white';
      const hInactiveCls = 'px-2 py-1 rounded text-[10px] font-bold transition text-slate-400 hover:text-white';

      if (hBtnP2P) hBtnP2P.className = (mode === 'p2p') ? \`\${hActiveCls} bg-emerald-600\` : hInactiveCls;
      if (hBtnLK) hBtnLK.className = (mode === 'livekit') ? \`\${hActiveCls} bg-indigo-600\` : hInactiveCls;
      if (hBtnDaily) hBtnDaily.className = (mode === 'daily') ? \`\${hActiveCls} bg-cyan-600\` : hInactiveCls;
    }

    async function broadcastVideoModeConfig(mode) {
      if (!roomChannel) return;
      const targetMode = (mode === 'livekit' || mode === 'daily') ? mode : 'p2p';
      let rUrl = dailyRoomUrl;
      if (targetMode === 'daily' && !rUrl && roomPin) {
        rUrl = await ensureDailyRoom(roomPin);
      }
      roomChannel.send({
        type: 'broadcast',
        event: 'VIDEO_MODE_CONFIG',
        payload: {
          videoMode: targetMode,
          videoEngine: targetMode,
          roomPin: roomPin,
          roomUrl: rUrl || \`https://\${DAILY_DOMAIN}/elt-live-\${roomPin}\`
        }
      });
    }

    document.getElementById('btnVideoModeP2P')?.addEventListener('click', () => setHostVideoMode('p2p'));
    document.getElementById('btnVideoModeLiveKit')?.addEventListener('click', () => setHostVideoMode('livekit'));
    document.getElementById('btnVideoModeDaily')?.addEventListener('click', () => setHostVideoMode('daily'));
    document.getElementById('headerBtnVideoModeP2P')?.addEventListener('click', () => setHostVideoMode('p2p'));
    document.getElementById('headerBtnVideoModeLiveKit')?.addEventListener('click', () => setHostVideoMode('livekit'));
    document.getElementById('headerBtnVideoModeDaily')?.addEventListener('click', () => setHostVideoMode('daily'));

    // Crear o recuperar sala temporal en Daily.co con REST API (expira en 4 horas)
    async function ensureDailyRoom(pin) {
      const roomName = \`elt-live-\${pin}\`;
      const expectedUrl = \`https://\${DAILY_DOMAIN}/\${roomName}\`;
      try {
        const res = await fetch('https://api.daily.co/v1/rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${DAILY_API_KEY}\`
          },
          body: JSON.stringify({
            name: roomName,
            privacy: 'public',
            properties: {
              exp: Math.floor(Date.now() / 1000) + (4 * 3600),
              enable_chat: false,
              enable_screenshare: true,
              start_audio_off: true,
              start_video_off: true
            }
          })
        });
        const data = await res.json().catch(() => ({}));
        if (data && data.url) {
          dailyRoomUrl = data.url;
          return data.url;
        }
      } catch (e) {
        console.warn('[Daily] Room creation or lookup notice:', e);
      }
      dailyRoomUrl = expectedUrl;
      return expectedUrl;
    }

    async function connectDailyHost(pin) {
      if (!window.DailyIframe) {
        console.error('[Daily] daily-js SDK no está cargado');
        return;
      }
      try {
        if (dailyCallObject) {
          try { await dailyCallObject.leave(); dailyCallObject.destroy(); } catch (e) {}
          dailyCallObject = null;
        }
        const roomUrl = await ensureDailyRoom(pin);
        const callObj = window.DailyIframe.createCallObject({
          audioSource: false,
          videoSource: false,
          userName: 'Profesor (Host)',
          dailyConfig: {
            experimentalChromeVideoMuteLightOff: true
          }
        });
        dailyCallObject = callObj;
        setupDailyEvents(callObj, true);

        await callObj.join({ url: roomUrl });
        console.log('[Daily] Host unido a sala Daily:', roomUrl);

        if (webrtcAudioEnabled) {
          callObj.setLocalAudio(true);
        }
        if (webrtcVideoEnabled) {
          callObj.setLocalVideo(true);
        }
      } catch (err) {
        console.error('[Daily] Error al conectar Host:', err);
      }
    }

    function setupDailyEvents(callObj, isHost) {
      function syncParticipant(p) {
        if (!p || p.local) return;
        const pId = p.session_id;
        const pName = p.user_name || 'Alumno';
        ensureRemotePeerCard(pId, pName);

        const card = document.getElementById(\`webrtc_card_\${pId}\`);
        const vidEl = document.getElementById(\`webrtc_video_\${pId}\`);
        const phEl = document.getElementById(\`webrtc_placeholder_\${pId}\`);
        const muteEl = document.getElementById(\`webrtc_mute_\${pId}\`);

        const hasAudio = Boolean(p.audio && p.audioTrack);
        const hasVideo = Boolean(p.video && p.videoTrack && !p.screen);

        if (muteEl) muteEl.classList.toggle('hidden', hasAudio);

        if (vidEl) {
          vidEl.setAttribute('playsinline', '');
          vidEl.setAttribute('webkit-playsinline', '');
          vidEl.setAttribute('autoplay', '');
          if (hasVideo && p.videoTrack) {
            const stream = new MediaStream([p.videoTrack]);
            if (vidEl.srcObject !== stream) vidEl.srcObject = stream;
            vidEl.classList.remove('hidden');
            if (phEl) phEl.classList.add('hidden');
            vidEl.play().catch(() => {});
          } else {
            vidEl.classList.add('hidden');
            if (phEl) phEl.classList.remove('hidden');
          }
        }

        // Audio dedicado headless
        if (hasAudio && p.audioTrack) {
          let aEl = document.getElementById(\`webrtc_audio_\${pId}\`);
          if (!aEl) {
            aEl = document.createElement('audio');
            aEl.id = \`webrtc_audio_\${pId}\`;
            aEl.setAttribute('data-p2p-peer', pId);
            aEl.autoplay = true;
            aEl.playsInline = true;
            aEl.setAttribute('playsinline', '');
            aEl.setAttribute('webkit-playsinline', '');
            aEl.muted = false;
            aEl.volume = 1.0;
            document.body.appendChild(aEl);
          }
          const aStream = new MediaStream([p.audioTrack]);
          if (aEl.srcObject !== aStream) aEl.srcObject = aStream;
          aEl.muted = false;
          aEl.volume = 1.0;
          aEl.play().catch(() => {});
        }

        // Pantalla compartida remota de estudiante
        if (p.screen && p.screenVideoTrack) {
          const screenVideo = document.getElementById('remoteScreenShareVideo');
          const screenOverlay = document.getElementById('remoteScreenShareOverlay');
          const screenLabel = document.getElementById('remoteScreenShareLabel');
          if (screenVideo) {
            screenVideo.srcObject = new MediaStream([p.screenVideoTrack]);
            screenVideo.muted = false;
            screenVideo.setAttribute('playsinline', '');
            screenVideo.setAttribute('webkit-playsinline', '');
            screenVideo.setAttribute('autoplay', '');
            screenVideo.play().catch(() => {});
          }
          if (screenLabel) screenLabel.textContent = \`🖥️ \${pName} compartiendo pantalla\`;
          if (screenOverlay) {
            screenOverlay.classList.remove('hidden');
            screenOverlay.classList.add('flex');
          }
        }
      }

      callObj.on('participant-joined', (evt) => syncParticipant(evt?.participant));
      callObj.on('participant-updated', (evt) => syncParticipant(evt?.participant));
      callObj.on('track-started', (evt) => {
        if (evt?.participant?.local) {
          handleDailyLocalTrack(evt.track);
        } else {
          syncParticipant(evt?.participant);
        }
      });
      callObj.on('track-stopped', (evt) => {
        if (evt?.participant?.local) {
          handleDailyLocalTrack(null);
        } else {
          syncParticipant(evt?.participant);
        }
      });
      callObj.on('participant-left', (evt) => {
        if (!evt?.participant) return;
        const pId = evt.participant.session_id;
        removeRemotePeerCard(pId, evt.participant.user_name);
        syncHostScreenShareStage();
      });
    }

    function handleDailyLocalTrack(track) {
      if (!webrtcLocalVideoEl) return;
      webrtcLocalVideoEl.muted = true;
      webrtcLocalVideoEl.setAttribute('muted', '');
      webrtcLocalVideoEl.setAttribute('playsinline', '');
      webrtcLocalVideoEl.setAttribute('webkit-playsinline', '');
      webrtcLocalVideoEl.setAttribute('autoplay', '');

      if (webrtcVideoEnabled && dailyCallObject) {
        const localP = dailyCallObject.participants()?.local;
        const vTrack = (track && track.kind === 'video') ? track : localP?.videoTrack;
        if (vTrack) {
          webrtcLocalVideoEl.srcObject = new MediaStream([vTrack]);
          webrtcLocalVideoEl.play().catch(() => {});
          webrtcLocalVideoEl.classList.remove('hidden');
          webrtcLocalPlaceholder?.classList.add('hidden');
          return;
        }
      }
      webrtcLocalVideoEl.srcObject = null;
      webrtcLocalVideoEl.classList.add('hidden');
      webrtcLocalPlaceholder?.classList.remove('hidden');
    }`;

if (!host.includes(oldHostModeLogic)) {
  console.error('ERROR: oldHostModeLogic not found in host.html');
  process.exit(1);
}
host = host.replace(oldHostModeLogic, newHostModeLogic);

// ==========================================
// 4. ACTUALIZAR startHostVideoEngine, toggleLocalAudio, toggleLocalVideo, toggleScreenShare, admitWaitingStudent EN HOST.HTML
// ==========================================

// startHostVideoEngine
const oldStartHost = `    async function startHostVideoEngine(mode) {
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

const newStartHost = `    async function startHostVideoEngine(mode) {
      const targetMode = (mode === 'livekit' || mode === 'daily') ? mode : 'p2p';
      currentVideoMode = targetMode;
      console.log('[ELT Live] Inicializando motor de video Host:', targetMode);

      const localCard = document.getElementById('webrtcLocalCard');
      const remoteCards = document.getElementById('webrtcRemoteCards');
      if (localCard) localCard.classList.remove('hidden');
      if (remoteCards) remoteCards.classList.remove('hidden');

      // Limpieza de motores inactivos
      if (targetMode !== 'livekit' && livekitRoom) {
        try { await livekitRoom.disconnect(); } catch (e) {}
        livekitRoom = null;
      }
      if (targetMode !== 'daily' && dailyCallObject) {
        try { await dailyCallObject.leave(); dailyCallObject.destroy(); } catch (e) {}
        dailyCallObject = null;
      }

      if (targetMode === 'daily') {
        if (roomPin) {
          await connectDailyHost(roomPin);
        }
      } else if (targetMode === 'livekit') {
        if (roomPin) {
          await connectLiveKit(roomPin, 'Profesor (Host)', true);
        }
      } else {
        // Modo Gratis WebRTC Nativo (P2P)
        if (typeof announceWebRTCPresence === 'function') {
          announceWebRTCPresence();
        }
      }
      updateLocalMediaButtonsUI();
    }`;

if (!host.includes(oldStartHost)) {
  console.error('ERROR: oldStartHost not found in host.html');
  process.exit(1);
}
host = host.replace(oldStartHost, newStartHost);

// toggleLocalAudio en host
const oldHostToggleAudio = `    async function toggleLocalAudio() {
      webrtcAudioEnabled = !webrtcAudioEnabled;
      if (currentVideoMode === 'livekit' && livekitRoom) {
        try {
          await livekitRoom.localParticipant.setMicrophoneEnabled(webrtcAudioEnabled);
        } catch (err) {
          console.warn('[LiveKit] Error alternando micrófono:', err);
          webrtcAudioEnabled = !webrtcAudioEnabled;
        }
      } else if (currentVideoMode === 'p2p') {`;

const newHostToggleAudio = `    async function toggleLocalAudio() {
      webrtcAudioEnabled = !webrtcAudioEnabled;
      if (currentVideoMode === 'daily' && dailyCallObject) {
        try {
          dailyCallObject.setLocalAudio(webrtcAudioEnabled);
        } catch (err) {
          console.warn('[Daily] Error alternando micrófono:', err);
          webrtcAudioEnabled = !webrtcAudioEnabled;
        }
      } else if (currentVideoMode === 'livekit' && livekitRoom) {
        try {
          await livekitRoom.localParticipant.setMicrophoneEnabled(webrtcAudioEnabled);
        } catch (err) {
          console.warn('[LiveKit] Error alternando micrófono:', err);
          webrtcAudioEnabled = !webrtcAudioEnabled;
        }
      } else if (currentVideoMode === 'p2p') {`;

if (!host.includes(oldHostToggleAudio)) {
  console.error('ERROR: oldHostToggleAudio not found in host.html');
  process.exit(1);
}
host = host.replace(oldHostToggleAudio, newHostToggleAudio);

// toggleLocalVideo en host
const oldHostToggleVideo = `    async function toggleLocalVideo() {
      webrtcVideoEnabled = !webrtcVideoEnabled;
      if (currentVideoMode === 'livekit' && livekitRoom) {
        try {
          await livekitRoom.localParticipant.setCameraEnabled(webrtcVideoEnabled);
          handleLocalCameraTrack();
        } catch (err) {
          console.warn('[LiveKit] Error alternando cámara:', err);
          webrtcVideoEnabled = !webrtcVideoEnabled;
        }
      } else if (currentVideoMode === 'p2p') {`;

const newHostToggleVideo = `    async function toggleLocalVideo() {
      webrtcVideoEnabled = !webrtcVideoEnabled;
      if (currentVideoMode === 'daily' && dailyCallObject) {
        try {
          dailyCallObject.setLocalVideo(webrtcVideoEnabled);
          handleDailyLocalTrack(null);
        } catch (err) {
          console.warn('[Daily] Error alternando cámara:', err);
          webrtcVideoEnabled = !webrtcVideoEnabled;
        }
      } else if (currentVideoMode === 'livekit' && livekitRoom) {
        try {
          await livekitRoom.localParticipant.setCameraEnabled(webrtcVideoEnabled);
          handleLocalCameraTrack();
        } catch (err) {
          console.warn('[LiveKit] Error alternando cámara:', err);
          webrtcVideoEnabled = !webrtcVideoEnabled;
        }
      } else if (currentVideoMode === 'p2p') {`;

if (!host.includes(oldHostToggleVideo)) {
  console.error('ERROR: oldHostToggleVideo not found in host.html');
  process.exit(1);
}
host = host.replace(oldHostToggleVideo, newHostToggleVideo);

// toggleScreenShare en host
const oldHostToggleScreen = `    async function toggleScreenShare() {
      if (currentVideoMode === 'livekit') {`;

const newHostToggleScreen = `    async function toggleScreenShare() {
      if (currentVideoMode === 'daily' && dailyCallObject) {
        try {
          if (isSharingScreen) {
            dailyCallObject.stopScreenShare();
            isSharingScreen = false;
            const screenVideo = document.getElementById('remoteScreenShareVideo');
            if (screenVideo) screenVideo.srcObject = null;
          } else {
            dailyCallObject.startScreenShare();
            isSharingScreen = true;
          }
          updateShareButtonUI();
          syncHostScreenShareStage();
          broadcastScreenShareState(isSharingScreen);
        } catch (e) {
          console.warn('[Daily] Error compartiendo pantalla:', e);
        }
        return;
      }
      if (currentVideoMode === 'livekit') {`;

if (!host.includes(oldHostToggleScreen)) {
  console.error('ERROR: oldHostToggleScreen not found in host.html');
  process.exit(1);
}
host = host.replace(oldHostToggleScreen, newHostToggleScreen);

// Salida / cierre de sesión en Host (#bottomEndBtn y beforeunload)
const oldHostEndBtn = `        if (typeof livekitRoom !== 'undefined' && livekitRoom) {
          try { await livekitRoom.disconnect(); } catch (e) {}
          livekitRoom = null;
        }`;

const newHostEndBtn = `        if (typeof dailyCallObject !== 'undefined' && dailyCallObject) {
          try { await dailyCallObject.leave(); dailyCallObject.destroy(); } catch (e) {}
          dailyCallObject = null;
        }
        if (typeof livekitRoom !== 'undefined' && livekitRoom) {
          try { await livekitRoom.disconnect(); } catch (e) {}
          livekitRoom = null;
        }`;

if (!host.includes(oldHostEndBtn)) {
  console.error('ERROR: oldHostEndBtn not found in host.html');
  process.exit(1);
}
host = host.replace(oldHostEndBtn, newHostEndBtn);

const oldHostBeforeUnload = `    window.addEventListener('beforeunload', () => {
      if (livekitRoom) {
        try { livekitRoom.disconnect(); } catch (e) {}
      }
      closeAllP2PConnections();
    });`;

const newHostBeforeUnload = `    window.addEventListener('beforeunload', () => {
      if (dailyCallObject) {
        try { dailyCallObject.leave(); dailyCallObject.destroy(); } catch (e) {}
      }
      if (livekitRoom) {
        try { livekitRoom.disconnect(); } catch (e) {}
      }
      closeAllP2PConnections();
    });`;

if (!host.includes(oldHostBeforeUnload)) {
  console.error('ERROR: oldHostBeforeUnload not found in host.html');
  process.exit(1);
}
host = host.replace(oldHostBeforeUnload, newHostBeforeUnload);

// Actualizar WAITING_ROOM_ADMIT en host.html para incluir roomUrl de Daily
const oldHostAdmitPayload = `        payload: {
          studentId: studentId,
          studentName: st.name,
          videoMode: currentVideoMode,
          videoEngine: currentVideoMode,
          roomPin: roomPin
        }`;

const newHostAdmitPayload = `        payload: {
          studentId: studentId,
          studentName: st.name,
          videoMode: currentVideoMode,
          videoEngine: currentVideoMode,
          roomPin: roomPin,
          roomUrl: dailyRoomUrl || \`https://\${DAILY_DOMAIN}/elt-live-\${roomPin}\`
        }`;

if (!host.includes(oldHostAdmitPayload)) {
  console.error('ERROR: oldHostAdmitPayload not found in host.html');
  process.exit(1);
}
host = host.replace(oldHostAdmitPayload, newHostAdmitPayload);


// ==========================================
// 5. MODIFICACIONES EN ELT LIVE WEB/student.html
// ==========================================

// Declaraciones de motor Daily en student.html
const oldStudentDeclarations = `    // ==================== ARQUITECTURA DUAL DE VIDEO: P2P GRATIS ILIMITADO / LIVEKIT SFU ====================
    let currentVideoMode = 'p2p'; // 'p2p' | 'livekit' (controlado automáticamente por el profesor de la sala)`;

const newStudentDeclarations = `    // ==================== ARQUITECTURA MULTI-MOTOR DE VIDEO: P2P GRATIS / LIVEKIT SFU / DAILY SFU ====================
    const DAILY_DOMAIN = 'elt-live.daily.co';
    let dailyCallObject = null;
    let dailyRoomUrl = null;
    let currentVideoMode = 'p2p'; // 'p2p' | 'livekit' | 'daily' (controlado automáticamente por el profesor de la sala)`;

if (!student.includes(oldStudentDeclarations)) {
  console.error('ERROR: oldStudentDeclarations not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentDeclarations, newStudentDeclarations);

// Implementación de connectDailyStudent y setupStudentDailyEvents en student.html
const studentDailyImplementation = `
    async function connectDailyStudent(roomUrl, studentName) {
      if (!window.DailyIframe) {
        console.error('[Daily] daily-js SDK no está disponible en Estudiante');
        return;
      }
      try {
        if (dailyCallObject) {
          try { await dailyCallObject.leave(); dailyCallObject.destroy(); } catch (e) {}
          dailyCallObject = null;
        }

        const url = roomUrl || \`https://\${DAILY_DOMAIN}/elt-live-\${currentRoomPin}\`;
        dailyRoomUrl = url;

        const callObj = window.DailyIframe.createCallObject({
          audioSource: false,
          videoSource: false,
          userName: studentName || myName || 'Alumno',
          dailyConfig: {
            experimentalChromeVideoMuteLightOff: true
          }
        });
        dailyCallObject = callObj;
        setupStudentDailyEvents(callObj);

        await callObj.join({ url: url });
        console.log('[Daily] Estudiante conectado exitosamente a Daily:', url);

        if (webrtcAudioEnabled) {
          callObj.setLocalAudio(true);
        }
        if (webrtcVideoEnabled) {
          callObj.setLocalVideo(true);
        }
        unlockAllP2PRemoteAudio();
      } catch (err) {
        console.error('[Daily] Error al conectar Estudiante:', err);
        showMediaAlert('No se pudo conectar a la llamada de video Daily.');
      }
    }

    function setupStudentDailyEvents(callObj) {
      function syncParticipant(p) {
        if (!p || p.local) return;
        const pId = p.session_id;
        const pName = p.user_name || 'Profesor';
        const isHost = (pName.includes('Profesor') || (p.owner === true));
        const role = isHost ? 'host' : 'student';

        const entry = ensureRemoteVideoCard(pId, pName, role);
        const card = document.getElementById(\`webrtcCard_\${pId}\`);
        const vidEl = entry?.videoEl || card?.querySelector('video');
        const phEl = entry?.placeholderEl || card?.querySelector('[data-role="placeholder"]');
        const micEl = entry?.micIconEl || card?.querySelector('[data-role="mute"]');

        const hasAudio = Boolean(p.audio && p.audioTrack);
        const hasVideo = Boolean(p.video && p.videoTrack && !p.screen);

        if (micEl) micEl.classList.toggle('hidden', hasAudio);

        if (vidEl) {
          vidEl.setAttribute('playsinline', '');
          vidEl.setAttribute('webkit-playsinline', '');
          vidEl.setAttribute('autoplay', '');
          if (hasVideo && p.videoTrack) {
            const stream = new MediaStream([p.videoTrack]);
            if (vidEl.srcObject !== stream) vidEl.srcObject = stream;
            vidEl.classList.remove('hidden');
            if (phEl) phEl.classList.add('hidden');
            vidEl.play().catch(() => {});
          } else {
            vidEl.classList.add('hidden');
            if (phEl) phEl.classList.remove('hidden');
          }
        }

        // Elemento de audio dedicado para asegurar reproducción de voz
        if (hasAudio && p.audioTrack) {
          let aEl = document.getElementById(\`webrtc_audio_\${pId}\`);
          if (!aEl) {
            aEl = document.createElement('audio');
            aEl.id = \`webrtc_audio_\${pId}\`;
            aEl.setAttribute('data-p2p-peer', pId);
            aEl.autoplay = true;
            aEl.playsInline = true;
            aEl.setAttribute('playsinline', '');
            aEl.setAttribute('webkit-playsinline', '');
            aEl.muted = false;
            aEl.volume = 1.0;
            document.body.appendChild(aEl);
          }
          const aStream = new MediaStream([p.audioTrack]);
          if (aEl.srcObject !== aStream) aEl.srcObject = aStream;
          aEl.muted = false;
          aEl.volume = 1.0;
          aEl.play().catch(() => {});
        }

        // Pantalla compartida remota del profesor o compañero
        if (p.screen && p.screenVideoTrack) {
          const stageVideo = document.getElementById('remoteScreenShareVideo');
          if (stageVideo) {
            stageVideo.srcObject = new MediaStream([p.screenVideoTrack]);
            stageVideo.muted = true;
            stageVideo.volume = 0;
            stageVideo.setAttribute('playsinline', '');
            stageVideo.setAttribute('webkit-playsinline', '');
            stageVideo.setAttribute('autoplay', '');
            stageVideo.play().catch(() => {});
          }
          window.__remoteScreenSharingActive = true;
          window.__remoteScreenSharingName = pName;
          if (webrtcPeers[pId]) webrtcPeers[pId].isSharingScreen = true;
          syncStudentRemoteScreenShareOverlay();
        }
      }

      callObj.on('participant-joined', (evt) => syncParticipant(evt?.participant));
      callObj.on('participant-updated', (evt) => syncParticipant(evt?.participant));
      callObj.on('track-started', (evt) => {
        if (evt?.participant?.local) {
          handleStudentDailyLocalTrack(evt.track);
        } else {
          syncParticipant(evt?.participant);
        }
      });
      callObj.on('track-stopped', (evt) => {
        if (evt?.participant?.local) {
          handleStudentDailyLocalTrack(null);
        } else {
          syncParticipant(evt?.participant);
        }
      });
      callObj.on('participant-left', (evt) => {
        if (!evt?.participant) return;
        const pId = evt.participant.session_id;
        const pName = evt.participant.user_name || 'Participante';
        const isHost = (pName.includes('Profesor') || (evt.participant.owner === true));
        if (isHost) {
          window.__remoteScreenSharingActive = false;
        }
        removeStudentRemoteVideoCard(pId, pName, isHost ? 'host' : 'student');
        syncStudentRemoteScreenShareOverlay();
      });
    }

    function handleStudentDailyLocalTrack(track) {
      const localVideo = document.getElementById('webrtcLocalVideo');
      const localPlaceholder = document.getElementById('webrtcLocalPlaceholder');
      if (!localVideo) return;

      localVideo.muted = true;
      localVideo.setAttribute('muted', '');
      localVideo.setAttribute('playsinline', '');
      localVideo.setAttribute('webkit-playsinline', '');
      localVideo.setAttribute('autoplay', '');

      if (webrtcVideoEnabled && dailyCallObject) {
        const localP = dailyCallObject.participants()?.local;
        const vTrack = (track && track.kind === 'video') ? track : localP?.videoTrack;
        if (vTrack) {
          localVideo.srcObject = new MediaStream([vTrack]);
          localVideo.play().catch(() => {});
          localVideo.classList.remove('hidden');
          if (localPlaceholder) localPlaceholder.classList.add('hidden');
          return;
        }
      }
      localVideo.srcObject = null;
      localVideo.classList.add('hidden');
      if (localPlaceholder) localPlaceholder.classList.remove('hidden');
    }
`;

// Insertar implementación de Daily en student.html justo antes de startStudentVideoEngine
student = student.replace('    async function startStudentVideoEngine(mode) {', studentDailyImplementation + '\n    async function startStudentVideoEngine(mode) {');

// startStudentVideoEngine en student.html
const oldStudentStart = `    async function startStudentVideoEngine(mode) {
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

const newStudentStart = `    async function startStudentVideoEngine(mode) {
      const targetMode = (mode === 'livekit' || mode === 'daily') ? mode : 'p2p';
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

      // Limpieza de motores inactivos
      if (targetMode !== 'livekit' && livekitRoom) {
        try { await livekitRoom.disconnect(); } catch (e) {}
        livekitRoom = null;
      }
      if (targetMode !== 'daily' && dailyCallObject) {
        try { await dailyCallObject.leave(); dailyCallObject.destroy(); } catch (e) {}
        dailyCallObject = null;
      }

      if (targetMode === 'daily') {
        await connectDailyStudent(dailyRoomUrl, myName || 'Alumno');
      } else if (targetMode === 'livekit') {
        if (currentRoomPin) {
          await connectLiveKit(currentRoomPin, myName || 'Alumno', false);
        }
      } else {
        // Modo Gratis WebRTC Nativo (P2P)
        if (typeof announceWebRTCPresence === 'function') {
          announceWebRTCPresence();
        }
      }
      updateLocalMediaUI();
    }`;

if (!student.includes(oldStudentStart)) {
  console.error('ERROR: oldStudentStart not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentStart, newStudentStart);

// toggleLocalAudio en student.html
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
      } else if (currentVideoMode === 'p2p') {`;

const newStudentToggleAudio = `    async function toggleLocalAudio() {
      webrtcAudioEnabled = !webrtcAudioEnabled;
      if (currentVideoMode === 'daily' && dailyCallObject) {
        try {
          dailyCallObject.setLocalAudio(webrtcAudioEnabled);
        } catch (err) {
          console.error('[Daily] Error al alternar micrófono en Estudiante:', err);
          webrtcAudioEnabled = !webrtcAudioEnabled;
          showMediaAlert('No se pudo acceder al micrófono: ' + (err.message || err.name || err));
        }
      } else if (currentVideoMode === 'livekit' && livekitRoom) {
        try {
          await livekitRoom.localParticipant.setMicrophoneEnabled(webrtcAudioEnabled);
        } catch (err) {
          console.error('[LiveKit] Error al alternar micrófono en Estudiante:', err);
          webrtcAudioEnabled = !webrtcAudioEnabled;
          showMediaAlert('No se pudo acceder al micrófono: ' + (err.message || err.name || err));
        }
      } else if (currentVideoMode === 'p2p') {`;

if (!student.includes(oldStudentToggleAudio)) {
  console.error('ERROR: oldStudentToggleAudio not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentToggleAudio, newStudentToggleAudio);

// toggleLocalVideo en student.html
const oldStudentToggleVideo = `    async function toggleLocalVideo() {
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
        } else if (currentVideoMode === 'p2p') {`;

const newStudentToggleVideo = `    async function toggleLocalVideo() {
      try {
        webrtcVideoEnabled = !webrtcVideoEnabled;
        if (currentVideoMode === 'daily' && dailyCallObject) {
          try {
            dailyCallObject.setLocalVideo(webrtcVideoEnabled);
            handleStudentDailyLocalTrack(null);
          } catch (dErr) {
            console.error('[Daily] Error al alternar cámara en Estudiante:', dErr);
            webrtcVideoEnabled = !webrtcVideoEnabled;
            showMediaAlert('No se pudo encender la cámara: ' + (dErr.message || dErr.name || dErr));
          }
        } else if (currentVideoMode === 'livekit' && livekitRoom) {
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
        } else if (currentVideoMode === 'p2p') {`;

if (!student.includes(oldStudentToggleVideo)) {
  console.error('ERROR: oldStudentToggleVideo not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentToggleVideo, newStudentToggleVideo);

// toggleScreenShare en student.html
const oldStudentToggleScreen = `    async function toggleScreenShare() {
      if (currentVideoMode === 'livekit') {`;

const newStudentToggleScreen = `    async function toggleScreenShare() {
      if (currentVideoMode === 'daily' && dailyCallObject) {
        try {
          if (isSharingScreen) {
            dailyCallObject.stopScreenShare();
            isSharingScreen = false;
            const stageVideo = document.getElementById('remoteScreenShareVideo');
            if (stageVideo) stageVideo.srcObject = null;
          } else {
            dailyCallObject.startScreenShare();
            isSharingScreen = true;
          }
          updateLocalMediaUI();
          syncStudentRemoteScreenShareOverlay();
          broadcastScreenShareState(isSharingScreen);
        } catch (e) {
          console.warn('[Daily] Error al alternar compartir pantalla en Estudiante:', e);
        }
        return;
      }
      if (currentVideoMode === 'livekit') {`;

if (!student.includes(oldStudentToggleScreen)) {
  console.error('ERROR: oldStudentToggleScreen not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentToggleScreen, newStudentToggleScreen);

// Salida / cierre de sesión en Estudiante (leaveStudentSession y beforeunload)
const oldStudentLeave = `    async function leaveStudentSession() {
      // 1. Desconectar LiveKit Room si está activa
      if (typeof livekitRoom !== 'undefined' && livekitRoom) {
        try {
          await livekitRoom.disconnect();
        } catch (err) {
          console.warn('[LiveKit] Error al desconectar sala:', err);
        }
        livekitRoom = null;
      }`;

const newStudentLeave = `    async function leaveStudentSession() {
      // 1. Desconectar Daily o LiveKit si están activos
      if (typeof dailyCallObject !== 'undefined' && dailyCallObject) {
        try {
          await dailyCallObject.leave();
          dailyCallObject.destroy();
        } catch (err) {
          console.warn('[Daily] Error al salir de sala:', err);
        }
        dailyCallObject = null;
      }
      if (typeof livekitRoom !== 'undefined' && livekitRoom) {
        try {
          await livekitRoom.disconnect();
        } catch (err) {
          console.warn('[LiveKit] Error al desconectar sala:', err);
        }
        livekitRoom = null;
      }`;

if (!student.includes(oldStudentLeave)) {
  console.error('ERROR: oldStudentLeave not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentLeave, newStudentLeave);

const oldStudentBeforeUnload = `    window.addEventListener('beforeunload', () => {
      if (livekitRoom) {
        try { livekitRoom.disconnect(); } catch (e) {}
      }`;

const newStudentBeforeUnload = `    window.addEventListener('beforeunload', () => {
      if (dailyCallObject) {
        try { dailyCallObject.leave(); dailyCallObject.destroy(); } catch (e) {}
      }
      if (livekitRoom) {
        try { livekitRoom.disconnect(); } catch (e) {}
      }`;

if (!student.includes(oldStudentBeforeUnload)) {
  console.error('ERROR: oldStudentBeforeUnload not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentBeforeUnload, newStudentBeforeUnload);

// Recepción de VIDEO_MODE_CONFIG y WAITING_ROOM_ADMIT en student.html
const oldStudentVideoModeConfig = `      channel.on('broadcast', { event: 'VIDEO_MODE_CONFIG' }, async ({ payload }) => {
        if (!payload) return;
        const targetMode = (payload.videoMode === 'livekit' || payload.videoEngine === 'livekit') ? 'livekit' : 'p2p';
        assignedVideoMode = targetMode;
        currentVideoMode = targetMode;`;

const newStudentVideoModeConfig = `      channel.on('broadcast', { event: 'VIDEO_MODE_CONFIG' }, async ({ payload }) => {
        if (!payload) return;
        const targetMode = (payload.videoMode === 'livekit' || payload.videoEngine === 'livekit')
          ? 'livekit'
          : (payload.videoMode === 'daily' || payload.videoEngine === 'daily')
            ? 'daily'
            : 'p2p';
        if (payload.roomUrl) dailyRoomUrl = payload.roomUrl;
        assignedVideoMode = targetMode;
        currentVideoMode = targetMode;`;

if (!student.includes(oldStudentVideoModeConfig)) {
  console.error('ERROR: oldStudentVideoModeConfig not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentVideoModeConfig, newStudentVideoModeConfig);

const oldStudentWaitingRoomAdmit = `            if (payload.videoMode || payload.videoEngine) {
              assignedVideoMode = (payload.videoMode === 'livekit' || payload.videoEngine === 'livekit') ? 'livekit' : 'p2p';
            }`;

const newStudentWaitingRoomAdmit = `            if (payload.videoMode || payload.videoEngine) {
              assignedVideoMode = (payload.videoMode === 'livekit' || payload.videoEngine === 'livekit')
                ? 'livekit'
                : (payload.videoMode === 'daily' || payload.videoEngine === 'daily')
                  ? 'daily'
                  : 'p2p';
            }
            if (payload.roomUrl) dailyRoomUrl = payload.roomUrl;`;

if (!student.includes(oldStudentWaitingRoomAdmit)) {
  console.error('ERROR: oldStudentWaitingRoomAdmit not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentWaitingRoomAdmit, newStudentWaitingRoomAdmit);

// Detección de presencia del host en student.html
const oldStudentPresenceHostMode = `const hMode = (u.videoMode === 'livekit' || u.videoEngine === 'livekit') ? 'livekit' : 'p2p';`;
const newStudentPresenceHostMode = `const hMode = (u.videoMode === 'livekit' || u.videoEngine === 'livekit')
              ? 'livekit'
              : (u.videoMode === 'daily' || u.videoEngine === 'daily')
                ? 'daily'
                : 'p2p';
            if (u.roomUrl) dailyRoomUrl = u.roomUrl;`;

if (!student.includes(oldStudentPresenceHostMode)) {
  console.error('ERROR: oldStudentPresenceHostMode not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentPresenceHostMode, newStudentPresenceHostMode);

// Restaurar CRLF si correspondía
if (isHostCRLF) {
  host = host.replace(/\n/g, '\r\n');
}
if (isStudentCRLF) {
  student = student.replace(/\n/g, '\r\n');
}

// ==========================================
// 6. GUARDAR ARCHIVOS Y SINCRONIZAR COPIAS
// ==========================================
fs.writeFileSync(hostPath, host, 'utf8');
console.log('host.html written successfully.');

fs.writeFileSync(studentPath, student, 'utf8');
console.log('ELT LIVE WEB/student.html written successfully.');

fs.writeFileSync(studentIndexPath, student, 'utf8');
console.log('ELT LIVE WEB/index.html synced successfully.');

fs.writeFileSync(studentRootPath, student, 'utf8');
console.log('student.html root synced successfully.');
