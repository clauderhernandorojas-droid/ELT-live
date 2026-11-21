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

console.log('Host length (LF):', host.length);
console.log('Student length (LF):', student.length);

// =========================================================================
// 1. MODIFICACIONES EN host.html (Eliminar Daily.co completamente)
// =========================================================================

// A) Eliminar script CDN de daily-js
const hostDailyCdn = '<script crossorigin src="https://unpkg.com/@daily-co/daily-js"></script>\n  ';
if (host.includes(hostDailyCdn)) {
  host = host.replace(hostDailyCdn, '');
} else if (host.includes('<script crossorigin src="https://unpkg.com/@daily-co/daily-js"></script>')) {
  host = host.replace('<script crossorigin src="https://unpkg.com/@daily-co/daily-js"></script>', '');
}

// B) Eliminar botones Daily de la barra de control y de la cabecera
const hostMainDailyBtn = `          <button id="btnVideoModeDaily" data-mode="daily" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white" title="Modo Daily.co SFU Headless (alta calidad y estabilidad)">
            <i class="fa-solid fa-video text-[11px]"></i>
            <span>Daily SFU</span>
          </button>\n`;
if (host.includes(hostMainDailyBtn)) {
  host = host.replace(hostMainDailyBtn, '');
}

const hostHeaderDailyBtn = `        <button id="headerBtnVideoModeDaily" data-mode="daily" type="button" class="px-2 py-1 rounded text-[10px] font-bold transition text-slate-400 hover:text-white" title="Modo Daily.co SFU">
          <i class="fa-solid fa-video text-[9px] mr-1"></i>Daily SFU
        </button>\n`;
if (host.includes(hostHeaderDailyBtn)) {
  host = host.replace(hostHeaderDailyBtn, '');
}

// C) WAITING_ROOM_ADMIT payload en host.html: quitar dailyRoomUrl
const oldHostAdmitPayload = `        payload: {
          studentId: studentId,
          studentName: st.name,
          videoMode: currentVideoMode,
          videoEngine: currentVideoMode,
          roomPin: roomPin,
          roomUrl: dailyRoomUrl || \`https://\${DAILY_DOMAIN}/elt-live-\${roomPin}\`
        }`;

const newHostAdmitPayload = `        payload: {
          studentId: studentId,
          studentName: st.name,
          videoMode: currentVideoMode,
          videoEngine: currentVideoMode,
          roomPin: roomPin
        }`;

if (!host.includes(oldHostAdmitPayload)) {
  console.error('ERROR: oldHostAdmitPayload not found in host.html');
  process.exit(1);
}
host = host.replace(oldHostAdmitPayload, newHostAdmitPayload);

// D) Reemplazar bloque de arquitectura de video de Host (eliminar constantes, ensureDailyRoom, connectDailyHost, setupDailyEvents, handleDailyLocalTrack)
const oldHostVideoArchitecture = `    // ==================== ARQUITECTURA MULTI-MOTOR DE VIDEO: P2P NATIVO / LIVEKIT SFU / DAILY SFU ====================
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

const newHostVideoArchitecture = `    // ==================== ARQUITECTURA DUAL DE VIDEO: WEBRTC NATIVO (P2P) / LIVEKIT SFU ====================
    let rawStoredMode = localStorage.getItem('elt_host_video_mode');
    if (rawStoredMode === 'daily') {
      rawStoredMode = 'p2p';
      try { localStorage.setItem('elt_host_video_mode', 'p2p'); } catch (e) {}
    }
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

if (!host.includes(oldHostVideoArchitecture)) {
  console.error('ERROR: oldHostVideoArchitecture not found in host.html');
  process.exit(1);
}
host = host.replace(oldHostVideoArchitecture, newHostVideoArchitecture);

// E) startHostVideoEngine en host.html
const oldHostStartEngine = `    async function startHostVideoEngine(mode) {
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

const newHostStartEngine = `    async function startHostVideoEngine(mode) {
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

if (!host.includes(oldHostStartEngine)) {
  console.error('ERROR: oldHostStartEngine not found in host.html');
  process.exit(1);
}
host = host.replace(oldHostStartEngine, newHostStartEngine);

// F) toggleLocalAudio en host.html
const oldHostToggleAudio = `    async function toggleLocalAudio() {
      webrtcAudioEnabled = !webrtcAudioEnabled;
      if (currentVideoMode === 'daily' && dailyCallObject) {
        try {
          dailyCallObject.setLocalAudio(webrtcAudioEnabled);
        } catch (err) {
          console.warn('[Daily] Error alternando micrófono:', err);
          webrtcAudioEnabled = !webrtcAudioEnabled;
        }
      } else if (currentVideoMode === 'livekit' && livekitRoom) {`;

const newHostToggleAudio = `    async function toggleLocalAudio() {
      webrtcAudioEnabled = !webrtcAudioEnabled;
      if (currentVideoMode === 'livekit' && livekitRoom) {`;

if (!host.includes(oldHostToggleAudio)) {
  console.error('ERROR: oldHostToggleAudio not found in host.html');
  process.exit(1);
}
host = host.replace(oldHostToggleAudio, newHostToggleAudio);

// G) toggleLocalVideo en host.html
const oldHostToggleVideo = `    async function toggleLocalVideo() {
      webrtcVideoEnabled = !webrtcVideoEnabled;
      if (currentVideoMode === 'daily' && dailyCallObject) {
        try {
          dailyCallObject.setLocalVideo(webrtcVideoEnabled);
          handleDailyLocalTrack(null);
        } catch (err) {
          console.warn('[Daily] Error alternando cámara:', err);
          webrtcVideoEnabled = !webrtcVideoEnabled;
        }
      } else if (currentVideoMode === 'livekit' && livekitRoom) {`;

const newHostToggleVideo = `    async function toggleLocalVideo() {
      webrtcVideoEnabled = !webrtcVideoEnabled;
      if (currentVideoMode === 'livekit' && livekitRoom) {`;

if (!host.includes(oldHostToggleVideo)) {
  console.error('ERROR: oldHostToggleVideo not found in host.html');
  process.exit(1);
}
host = host.replace(oldHostToggleVideo, newHostToggleVideo);

// H) toggleScreenShare en host.html
const oldHostToggleScreen = `    async function toggleScreenShare() {
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

const newHostToggleScreen = `    async function toggleScreenShare() {
      if (currentVideoMode === 'livekit') {`;

if (!host.includes(oldHostToggleScreen)) {
  console.error('ERROR: oldHostToggleScreen not found in host.html');
  process.exit(1);
}
host = host.replace(oldHostToggleScreen, newHostToggleScreen);

// I) Limpiezas de Daily en host bottomEndBtn y beforeunload
const oldHostEndBtn = `        if (typeof dailyCallObject !== 'undefined' && dailyCallObject) {
          try { await dailyCallObject.leave(); dailyCallObject.destroy(); } catch (e) {}
          dailyCallObject = null;
        }
        if (typeof livekitRoom !== 'undefined' && livekitRoom) {`;

const newHostEndBtn = `        if (typeof livekitRoom !== 'undefined' && livekitRoom) {`;

if (!host.includes(oldHostEndBtn)) {
  console.error('ERROR: oldHostEndBtn not found in host.html');
  process.exit(1);
}
host = host.replace(oldHostEndBtn, newHostEndBtn);

const oldHostBeforeUnload = `    window.addEventListener('beforeunload', () => {
      if (dailyCallObject) {
        try { dailyCallObject.leave(); dailyCallObject.destroy(); } catch (e) {}
      }
      if (livekitRoom) {`;

const newHostBeforeUnload = `    window.addEventListener('beforeunload', () => {
      if (livekitRoom) {`;

if (!host.includes(oldHostBeforeUnload)) {
  console.error('ERROR: oldHostBeforeUnload not found in host.html');
  process.exit(1);
}
host = host.replace(oldHostBeforeUnload, newHostBeforeUnload);


// =========================================================================
// 2. MODIFICACIONES EN ELT LIVE WEB/student.html
// =========================================================================

// A) Eliminar script CDN de daily-js
const studentDailyCdn = '<script crossorigin src="https://unpkg.com/@daily-co/daily-js"></script>\n  ';
if (student.includes(studentDailyCdn)) {
  student = student.replace(studentDailyCdn, '');
} else if (student.includes('<script crossorigin src="https://unpkg.com/@daily-co/daily-js"></script>')) {
  student = student.replace('<script crossorigin src="https://unpkg.com/@daily-co/daily-js"></script>', '');
}

// B) Declaración de variables de modo en student.html (eliminar DAILY_DOMAIN, dailyCallObject, etc.)
const oldStudentDecls = `    // ==================== ARQUITECTURA MULTI-MOTOR DE VIDEO: P2P GRATIS / LIVEKIT SFU / DAILY SFU ====================
    const DAILY_DOMAIN = 'elt-live.daily.co';
    let dailyCallObject = null;
    let dailyRoomUrl = null;
    let currentVideoMode = 'p2p'; // 'p2p' | 'livekit' | 'daily' (controlado automáticamente por el profesor de la sala)`;

const newStudentDecls = `    // ==================== ARQUITECTURA DUAL DE VIDEO: P2P GRATIS ILIMITADO / LIVEKIT SFU ====================
    let currentVideoMode = 'p2p'; // 'p2p' | 'livekit' (controlado automáticamente por el profesor de la sala)`;

if (!student.includes(oldStudentDecls)) {
  console.error('ERROR: oldStudentDecls not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentDecls, newStudentDecls);

// C) Detección de presencia del host en student.html
const oldStudentPresence = `            const hMode = (u.videoMode === 'livekit' || u.videoEngine === 'livekit')
              ? 'livekit'
              : (u.videoMode === 'daily' || u.videoEngine === 'daily')
                ? 'daily'
                : 'p2p';
            if (u.roomUrl) dailyRoomUrl = u.roomUrl;`;

const newStudentPresence = `            const hMode = (u.videoMode === 'livekit' || u.videoEngine === 'livekit') ? 'livekit' : 'p2p';`;

if (!student.includes(oldStudentPresence)) {
  console.error('ERROR: oldStudentPresence not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentPresence, newStudentPresence);

// D) WAITING_ROOM_ADMIT en student.html
const oldStudentAdmit = `            if (payload.videoMode || payload.videoEngine) {
              assignedVideoMode = (payload.videoMode === 'livekit' || payload.videoEngine === 'livekit')
                ? 'livekit'
                : (payload.videoMode === 'daily' || payload.videoEngine === 'daily')
                  ? 'daily'
                  : 'p2p';
            }
            if (payload.roomUrl) dailyRoomUrl = payload.roomUrl;`;

const newStudentAdmit = `            if (payload.videoMode || payload.videoEngine) {
              assignedVideoMode = (payload.videoMode === 'livekit' || payload.videoEngine === 'livekit') ? 'livekit' : 'p2p';
            }`;

if (!student.includes(oldStudentAdmit)) {
  console.error('ERROR: oldStudentAdmit not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentAdmit, newStudentAdmit);

// E) VIDEO_MODE_CONFIG en student.html
const oldStudentVideoModeConfig = `      channel.on('broadcast', { event: 'VIDEO_MODE_CONFIG' }, async ({ payload }) => {
        if (!payload) return;
        const targetMode = (payload.videoMode === 'livekit' || payload.videoEngine === 'livekit')
          ? 'livekit'
          : (payload.videoMode === 'daily' || payload.videoEngine === 'daily')
            ? 'daily'
            : 'p2p';
        if (payload.roomUrl) dailyRoomUrl = payload.roomUrl;
        assignedVideoMode = targetMode;
        currentVideoMode = targetMode;`;

const newStudentVideoModeConfig = `      channel.on('broadcast', { event: 'VIDEO_MODE_CONFIG' }, async ({ payload }) => {
        if (!payload) return;
        const targetMode = (payload.videoMode === 'livekit' || payload.videoEngine === 'livekit') ? 'livekit' : 'p2p';
        assignedVideoMode = targetMode;
        currentVideoMode = targetMode;`;

if (!student.includes(oldStudentVideoModeConfig)) {
  console.error('ERROR: oldStudentVideoModeConfig not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentVideoModeConfig, newStudentVideoModeConfig);

// F) Eliminar bloque completo de connectDailyStudent, setupStudentDailyEvents y handleStudentDailyLocalTrack en student.html
const oldDailyStudentBlock = `    async function connectDailyStudent(roomUrl, studentName) {
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

if (!student.includes(oldDailyStudentBlock)) {
  console.error('ERROR: oldDailyStudentBlock not found in student.html');
  process.exit(1);
}
student = student.replace(oldDailyStudentBlock, '');

// G) startStudentVideoEngine en student.html
const oldStudentStartEngine = `    async function startStudentVideoEngine(mode) {
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

const newStudentStartEngine = `    async function startStudentVideoEngine(mode) {
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

if (!student.includes(oldStudentStartEngine)) {
  console.error('ERROR: oldStudentStartEngine not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentStartEngine, newStudentStartEngine);

// H) toggleLocalAudio en student.html
const oldStudentToggleAudio = `    async function toggleLocalAudio() {
      webrtcAudioEnabled = !webrtcAudioEnabled;
      if (currentVideoMode === 'daily' && dailyCallObject) {
        try {
          dailyCallObject.setLocalAudio(webrtcAudioEnabled);
        } catch (err) {
          console.error('[Daily] Error al alternar micrófono en Estudiante:', err);
          webrtcAudioEnabled = !webrtcAudioEnabled;
          showMediaAlert('No se pudo acceder al micrófono: ' + (err.message || err.name || err));
        }
      } else if (currentVideoMode === 'livekit' && livekitRoom) {`;

const newStudentToggleAudio = `    async function toggleLocalAudio() {
      webrtcAudioEnabled = !webrtcAudioEnabled;
      if (currentVideoMode === 'livekit' && livekitRoom) {`;

if (!student.includes(oldStudentToggleAudio)) {
  console.error('ERROR: oldStudentToggleAudio not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentToggleAudio, newStudentToggleAudio);

// I) toggleLocalVideo en student.html
const oldStudentToggleVideo = `    async function toggleLocalVideo() {
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
        } else if (currentVideoMode === 'livekit' && livekitRoom) {`;

const newStudentToggleVideo = `    async function toggleLocalVideo() {
      try {
        webrtcVideoEnabled = !webrtcVideoEnabled;
        if (currentVideoMode === 'livekit' && livekitRoom) {`;

if (!student.includes(oldStudentToggleVideo)) {
  console.error('ERROR: oldStudentToggleVideo not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentToggleVideo, newStudentToggleVideo);

// J) toggleScreenShare en student.html
const oldStudentToggleScreen = `    async function toggleScreenShare() {
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

const newStudentToggleScreen = `    async function toggleScreenShare() {
      if (currentVideoMode === 'livekit') {`;

if (!student.includes(oldStudentToggleScreen)) {
  console.error('ERROR: oldStudentToggleScreen not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentToggleScreen, newStudentToggleScreen);

// K) Salida y beforeunload en student.html
const oldStudentLeave = `    async function leaveStudentSession() {
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
      if (typeof livekitRoom !== 'undefined' && livekitRoom) {`;

const newStudentLeave = `    async function leaveStudentSession() {
      // 1. Desconectar LiveKit Room si está activa
      if (typeof livekitRoom !== 'undefined' && livekitRoom) {`;

if (!student.includes(oldStudentLeave)) {
  console.error('ERROR: oldStudentLeave not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentLeave, newStudentLeave);

const oldStudentBeforeUnload = `    window.addEventListener('beforeunload', () => {
      if (dailyCallObject) {
        try { dailyCallObject.leave(); dailyCallObject.destroy(); } catch (e) {}
      }
      if (livekitRoom) {`;

const newStudentBeforeUnload = `    window.addEventListener('beforeunload', () => {
      if (livekitRoom) {`;

if (!student.includes(oldStudentBeforeUnload)) {
  console.error('ERROR: oldStudentBeforeUnload not found in student.html');
  process.exit(1);
}
student = student.replace(oldStudentBeforeUnload, newStudentBeforeUnload);


// =========================================================================
// 3. CORRECCIÓN DEL FONDO BLANCO EN student.html PARA MODO GALERÍA ZOOM
// =========================================================================

// A) En HTML: Cambiar bg-white de #leftWorkspaceColumn y #studentFrameContainer a fondo oscuro #0a0c10
const oldWorkspaceColHtml = `<div id="leftWorkspaceColumn" class="flex-1 min-w-0 h-full flex flex-col relative overflow-hidden bg-white">`;
const newWorkspaceColHtml = `<div id="leftWorkspaceColumn" class="flex-1 min-w-0 h-full flex flex-col relative overflow-hidden bg-[#0a0c10]">`;

if (!student.includes(oldWorkspaceColHtml)) {
  console.error('ERROR: oldWorkspaceColHtml not found in student.html');
  process.exit(1);
}
student = student.replace(oldWorkspaceColHtml, newWorkspaceColHtml);

const oldFrameContainerHtml = `<main id="studentFrameContainer" class="flex-1 min-h-0 w-full relative overflow-hidden bg-white">`;
const newFrameContainerHtml = `<main id="studentFrameContainer" class="flex-1 min-h-0 w-full relative overflow-hidden bg-[#0a0c10]">`;

if (!student.includes(oldFrameContainerHtml)) {
  console.error('ERROR: oldFrameContainerHtml not found in student.html');
  process.exit(1);
}
student = student.replace(oldFrameContainerHtml, newFrameContainerHtml);

// B) En syncVideoGalleryMode: ocultar explícitamente #studentFrameContainer (display: none) y mostrarlo únicamente cuando hay contenido activo
const oldSyncVideoGallery = `    function syncVideoGalleryMode() {
      const strip = document.getElementById('webrtcVideoStrip');
      const expandedBody = document.getElementById('webrtcStripExpandedBody');
      const waitingCover = document.getElementById('waitingCover');
      if (!strip || !expandedBody) return;

      const hasContent = hasActiveSharedContent();

      if (!hasContent) {
        // MODO GALERÍA GRANDE: Se expande ocupando el área de trabajo
        isGalleryModeActive = true;
        strip.classList.add('gallery-mode');
        // Ocultar placeholder blanco para evitar destellos
        if (waitingCover) waitingCover.classList.add('hidden');

        // Limpiar posiciones inline de arrastre previo
        strip.style.left = '';
        strip.style.top = '';
        strip.style.bottom = '';
        strip.style.right = '';
        strip.style.transform = '';

        // Si estaba minimizado, restaurarlo en galería
        if (isVideoStripMinimized) {
          isVideoStripMinimized = false;
          const minPill = document.getElementById('webrtcStripMinimizedPill');
          if (minPill) { minPill.classList.add('hidden'); minPill.classList.remove('flex'); }
          expandedBody.classList.remove('hidden');
        }

        // Calcular cantidad de participantes visibles
        const remoteCards = strip.querySelectorAll('[id^="webrtcCard_"]');
        const count = 1 + (remoteCards ? remoteCards.length : 0);

        expandedBody.classList.remove('gallery-count-1', 'gallery-count-2', 'gallery-count-3', 'gallery-count-4', 'gallery-count-many');
        if (count === 1) {
          expandedBody.classList.add('gallery-count-1');
        } else if (count === 2) {
          expandedBody.classList.add('gallery-count-2');
        } else if (count === 3) {
          expandedBody.classList.add('gallery-count-3');
        } else if (count === 4) {
          expandedBody.classList.add('gallery-count-4');
        } else {
          expandedBody.classList.add('gallery-count-many');
        }
      } else {
        // MODO COMPACTO FLOTANTE: Hay lección, pizarra o screen share activo
        isGalleryModeActive = false;
        strip.classList.remove('gallery-mode');
        expandedBody.classList.remove('gallery-count-1', 'gallery-count-2', 'gallery-count-3', 'gallery-count-4', 'gallery-count-many');

        // Restaurar posición flotante predeterminada si no tiene coordenadas personalizadas
        if (strip.style.left === '' && strip.style.top === '') {
          strip.style.bottom = '3.5rem';
          strip.style.right = '0.75rem';
        }
      }
    }`;

const newSyncVideoGallery = `    function syncVideoGalleryMode() {
      const strip = document.getElementById('webrtcVideoStrip');
      const expandedBody = document.getElementById('webrtcStripExpandedBody');
      const waitingCover = document.getElementById('waitingCover');
      const frameContainer = document.getElementById('studentFrameContainer');
      const workspaceCol = document.getElementById('leftWorkspaceColumn');
      if (!strip || !expandedBody) return;

      const hasContent = hasActiveSharedContent();

      if (!hasContent) {
        // MODO GALERÍA GRANDE: Se expande ocupando el escenario completo sobre fondo oscuro
        isGalleryModeActive = true;
        strip.classList.add('gallery-mode');

        // Ocultar completamente el contenedor blanco didáctico y el waitingCover
        if (frameContainer) frameContainer.style.display = 'none';
        if (waitingCover) waitingCover.classList.add('hidden');
        if (workspaceCol) {
          workspaceCol.classList.remove('bg-white');
          workspaceCol.classList.add('bg-[#0a0c10]');
        }

        // Limpiar posiciones inline de arrastre previo
        strip.style.left = '';
        strip.style.top = '';
        strip.style.bottom = '';
        strip.style.right = '';
        strip.style.transform = '';

        // Si estaba minimizado, restaurarlo en galería
        if (isVideoStripMinimized) {
          isVideoStripMinimized = false;
          const minPill = document.getElementById('webrtcStripMinimizedPill');
          if (minPill) { minPill.classList.add('hidden'); minPill.classList.remove('flex'); }
          expandedBody.classList.remove('hidden');
        }

        // Calcular cantidad de participantes visibles
        const remoteCards = strip.querySelectorAll('[id^="webrtcCard_"]');
        const count = 1 + (remoteCards ? remoteCards.length : 0);

        expandedBody.classList.remove('gallery-count-1', 'gallery-count-2', 'gallery-count-3', 'gallery-count-4', 'gallery-count-many');
        if (count === 1) {
          expandedBody.classList.add('gallery-count-1');
        } else if (count === 2) {
          expandedBody.classList.add('gallery-count-2');
        } else if (count === 3) {
          expandedBody.classList.add('gallery-count-3');
        } else if (count === 4) {
          expandedBody.classList.add('gallery-count-4');
        } else {
          expandedBody.classList.add('gallery-count-many');
        }
      } else {
        // MODO COMPACTO FLOTANTE: Hay lección, pizarra o screen share activo
        isGalleryModeActive = false;
        strip.classList.remove('gallery-mode');
        expandedBody.classList.remove('gallery-count-1', 'gallery-count-2', 'gallery-count-3', 'gallery-count-4', 'gallery-count-many');

        // Restaurar visibilidad del contenedor de trabajo
        if (frameContainer) frameContainer.style.display = '';
        if (workspaceCol) {
          workspaceCol.classList.remove('bg-[#0a0c10]');
          workspaceCol.classList.add('bg-white');
        }

        // Restaurar posición flotante predeterminada si no tiene coordenadas personalizadas
        if (strip.style.left === '' && strip.style.top === '') {
          strip.style.bottom = '3.5rem';
          strip.style.right = '0.75rem';
        }
      }
    }`;

if (!student.includes(oldSyncVideoGallery)) {
  console.error('ERROR: oldSyncVideoGallery not found in student.html');
  process.exit(1);
}
student = student.replace(oldSyncVideoGallery, newSyncVideoGallery);


// Restaurar terminaciones originales CRLF si corresponde
if (isHostCRLF) {
  host = host.replace(/\n/g, '\r\n');
}
if (isStudentCRLF) {
  student = student.replace(/\n/g, '\r\n');
}

// =========================================================================
// 4. GUARDAR Y SINCRONIZAR COPIAS IDÉNTICAS
// =========================================================================
fs.writeFileSync(hostPath, host, 'utf8');
console.log('host.html updated successfully.');

fs.writeFileSync(studentPath, student, 'utf8');
console.log('ELT LIVE WEB/student.html updated successfully.');

fs.writeFileSync(studentIndexPath, student, 'utf8');
console.log('ELT LIVE WEB/index.html synced successfully.');

fs.writeFileSync(studentRootPath, student, 'utf8');
console.log('student.html root synced successfully.');
