const fs = require('fs');

function normalizeNewlines(str) {
  return str.replace(/\r\n/g, '\n');
}

// ==========================================
// 1. UPDATE host.html
// ==========================================
function updateHost(content) {
  let isCrlf = content.includes('\r\n');
  content = normalizeNewlines(content);

  // 1.1 Update Selector Buttons Text and Tooltips
  // Selector en lobby:
  content = content.replace(
    `<button id="btnVideoModeP2P" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-emerald-600 text-white shadow-xs" title="Modo Gratis: Jitsi Meet SFU comunitario ilimitado y gratis (sin cuota)">
            <i class="fa-solid fa-users text-[11px]"></i>
            <span>Gratis (Jitsi SFU)</span>
          </button>`,
    `<button id="btnVideoModeP2P" type="button" class="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-emerald-600 text-white shadow-xs" title="Modo Gratis: VDO.Ninja SFU ilimitado y gratis (sin cuota, sin login)">
            <i class="fa-solid fa-users text-[11px]"></i>
            <span>Gratis (VDO SFU)</span>
          </button>`
  );

  // Selector en cabecera:
  content = content.replace(
    `<button id="headerBtnVideoModeP2P" type="button" class="px-2 py-1 rounded text-[10px] font-bold transition bg-emerald-600 text-white" title="Modo Gratis Jitsi SFU Ilimitado">
          <i class="fa-solid fa-users text-[9px] mr-1"></i>Gratis (Jitsi SFU)
        </button>`,
    `<button id="headerBtnVideoModeP2P" type="button" class="px-2 py-1 rounded text-[10px] font-bold transition bg-emerald-600 text-white" title="Modo Gratis VDO.Ninja SFU Ilimitado">
          <i class="fa-solid fa-users text-[9px] mr-1"></i>Gratis (VDO SFU)
        </button>`
  );

  // Botón expandir título
  content = content.replace(
    `title="Expandir / Reducir tamaño de Jitsi"`,
    `title="Expandir / Reducir tamaño de video"`
  );

  // 1.2 Update WAITING_ROOM_ADMIT payload in host.html (around line 1995)
  const hostAdmitPayloadOld = `        payload: {
          studentId: studentId,
          studentName: st.name,
          videoMode: currentVideoMode,
          videoEngine: currentVideoMode,
          jitsiRoomName: getOrCreateJitsiRoomName(),
          jitsiDomain: JITSI_COMMUNITY_DOMAIN
        }`;

  const hostAdmitPayloadNew = `        payload: {
          studentId: studentId,
          studentName: st.name,
          videoMode: currentVideoMode,
          videoEngine: currentVideoMode,
          vdoRoom: getOrCreateVDORoomName(),
          roomPin: roomPin
        }`;

  if (!content.includes(hostAdmitPayloadOld)) {
    throw new Error('Host WAITING_ROOM_ADMIT payload match failed');
  }
  content = content.replace(hostAdmitPayloadOld, hostAdmitPayloadNew);

  // 1.3 Update roomChannel.track in host.html (around line 2280)
  const hostTrackOld = `          await roomChannel.track({
            name: 'Profesor (Host)',
            role: 'host',
            videoMode: currentVideoMode,
            videoEngine: currentVideoMode,
            jitsiRoomName: getOrCreateJitsiRoomName(),
            jitsiDomain: JITSI_COMMUNITY_DOMAIN,
            peerId: webrtcMyPeerId,
            audioEnabled: webrtcAudioEnabled,
            videoEnabled: webrtcVideoEnabled
          });`;

  const hostTrackNew = `          await roomChannel.track({
            name: 'Profesor (Host)',
            role: 'host',
            videoMode: currentVideoMode,
            videoEngine: currentVideoMode,
            vdoRoom: getOrCreateVDORoomName(),
            peerId: webrtcMyPeerId,
            audioEnabled: webrtcAudioEnabled,
            videoEnabled: webrtcVideoEnabled
          });`;

  if (!content.includes(hostTrackOld)) {
    throw new Error('Host roomChannel.track match failed');
  }
  content = content.replace(hostTrackOld, hostTrackNew);

  // 1.4 Replace Jitsi implementation in Host (around lines 5075-5240)
  const hostJitsiSectionOld = `    // ==================== ARQUITECTURA DUAL DE VIDEO: JITSI SFU GRATIS / LIVEKIT SFU ====================
    let rawStoredMode = localStorage.getItem('elt_host_video_mode');
    let currentVideoMode = (rawStoredMode === 'livekit') ? 'livekit' : 'jitsi';
    let currentJitsiRoomName = null;
    const JITSI_COMMUNITY_DOMAIN = 'meet.jit.si';
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
        const s = document.createElement('script');
        s.src = 'https://meet.jit.si/external_api.js';
        s.async = true;
        s.onload = () => { jitsiScriptLoaded = true; resolve(true); };
        s.onerror = (e) => {
          console.error('[Jitsi] Error cargando external_api.js desde meet.jit.si:', e);
          resolve(false);
        };
        document.head.appendChild(s);
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
              disableDeepLinking: true,
              prejoinPageEnabled: false,
              startWithAudioMuted: true,
              startWithVideoMuted: true,
              toolbarButtons: ['microphone', 'camera'],
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
              TOOLBAR_BUTTONS: ['microphone', 'camera']
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

  const hostJitsiSectionNew = `    // ==================== ARQUITECTURA DUAL DE VIDEO: VDO.NINJA SFU GRATIS / LIVEKIT SFU ====================
    let rawStoredMode = localStorage.getItem('elt_host_video_mode');
    let currentVideoMode = (rawStoredMode === 'livekit') ? 'livekit' : 'vdo';
    let currentVDORoomName = null;

    function getOrCreateVDORoomName() {
      if (!currentVDORoomName) {
        const pin = roomPin || '0000';
        currentVDORoomName = 'ELTLive' + pin + Math.random().toString(36).substring(2, 7);
      }
      return currentVDORoomName;
    }

    function mountVDONinja(containerEl, vdoRoom, displayName, isHost = true) {
      if (!containerEl || !vdoRoom) return null;
      containerEl.innerHTML = '';

      const pin = roomPin || '0000';
      const pushParam = isHost ? \`Host_\${pin}\` : \`Stu_\${encodeURIComponent(displayName || 'Alumno')}_\${Math.floor(Math.random() * 999)}\`;
      const labelParam = isHost ? 'Profesor' : encodeURIComponent(displayName || 'Alumno');

      const iframeUrl = \`https://vdo.ninja/?room=\${encodeURIComponent(vdoRoom)}&push=\${pushParam}&label=\${labelParam}&cleanoutput&autostart&noheader&novideo\`;

      const iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.setAttribute('allow', 'camera; microphone; fullscreen; display-capture; autoplay');
      containerEl.appendChild(iframe);
      return iframe;
    }

    function setHostVideoMode(mode) {
      currentVideoMode = (mode === 'livekit') ? 'livekit' : 'vdo';
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
      const isVDO = (currentVideoMode === 'vdo' || currentVideoMode === 'jitsi' || currentVideoMode === 'p2p');

      const btnP2P = document.getElementById('btnVideoModeP2P');
      const btnLK = document.getElementById('btnVideoModeLiveKit');
      if (btnP2P && btnLK) {
        btnP2P.className = isVDO
          ? 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-emerald-600 text-white shadow-xs'
          : 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white';
        btnLK.className = !isVDO
          ? 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 bg-indigo-600 text-white shadow-xs'
          : 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 text-slate-400 hover:text-white';
      }

      const hBtnP2P = document.getElementById('headerBtnVideoModeP2P');
      const hBtnLK = document.getElementById('headerBtnVideoModeLiveKit');
      if (hBtnP2P && hBtnLK) {
        hBtnP2P.className = isVDO
          ? 'px-2 py-1 rounded text-[10px] font-bold transition bg-emerald-600 text-white'
          : 'px-2 py-1 rounded text-[10px] font-bold transition text-slate-400 hover:text-white';
        hBtnLK.className = !isVDO
          ? 'px-2 py-1 rounded text-[10px] font-bold transition bg-indigo-600 text-white'
          : 'px-2 py-1 rounded text-[10px] font-bold transition text-slate-400 hover:text-white';
      }
    }

    function broadcastVideoModeConfig(mode) {
      if (!roomChannel) return;
      const targetMode = (mode === 'livekit') ? 'livekit' : 'vdo';
      const vRoom = getOrCreateVDORoomName();
      roomChannel.send({
        type: 'broadcast',
        event: 'VIDEO_MODE_CONFIG',
        payload: {
          videoMode: targetMode,
          videoEngine: 'vdo',
          vdoRoom: vRoom,
          roomPin: roomPin
        }
      });
    }

    document.getElementById('btnVideoModeP2P')?.addEventListener('click', () => setHostVideoMode('vdo'));
    document.getElementById('btnVideoModeLiveKit')?.addEventListener('click', () => setHostVideoMode('livekit'));
    document.getElementById('headerBtnVideoModeP2P')?.addEventListener('click', () => setHostVideoMode('vdo'));
    document.getElementById('headerBtnVideoModeLiveKit')?.addEventListener('click', () => setHostVideoMode('livekit'));`;

  if (!content.includes(hostJitsiSectionOld)) {
    throw new Error('Host Jitsi section match failed');
  }
  content = content.replace(hostJitsiSectionOld, hostJitsiSectionNew);

  // 1.5 Update startHostVideoEngine in host.html (around line 5955)
  const hostEngineOld = `    async function startHostVideoEngine(mode) {
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
        const stripLK = document.getElementById('webrtcVideoStrip');
        if (stripLK) stripLK.classList.remove('jitsi-mode');
        if (localCard) localCard.classList.remove('hidden');
        if (remoteCards) remoteCards.classList.remove('hidden');

        if (roomPin) {
          await connectLiveKit(roomPin, 'Profesor (Host)', true);
        }
      } else {
        // Modo Gratis Jitsi SFU (meet.jit.si)
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
          const jRoom = getOrCreateJitsiRoomName();
          await mountJitsiMeet(jitsiContainer, jRoom, 'Profesor (Host)', JITSI_COMMUNITY_DOMAIN);
        }
      }
      updateLocalMediaButtonsUI();
    }`;

  const hostEngineNew = `    async function startHostVideoEngine(mode) {
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

  if (!content.includes(hostEngineOld)) {
    throw new Error('Host startHostVideoEngine match failed');
  }
  content = content.replace(hostEngineOld, hostEngineNew);

  // 1.6 Update ensureRemotePeerCard guard
  content = content.replace(
    "if (currentVideoMode === 'jitsi') return null;",
    "if (currentVideoMode === 'vdo' || currentVideoMode === 'jitsi') return null;"
  );

  if (isCrlf) {
    content = content.replace(/\n/g, '\r\n');
  }
  return content;
}

// ==========================================
// 2. UPDATE student.html
// ==========================================
function updateStudent(content) {
  let isCrlf = content.includes('\r\n');
  content = normalizeNewlines(content);

  // 2.1 Update title in button
  content = content.replace(
    `title="Expandir / Reducir tamaño de Jitsi"`,
    `title="Expandir / Reducir tamaño de video"`
  );

  // 2.2 Update presence sync in student.html (around line 2040)
  const studentPresHostOld = `          if (key === 'host' || u.role === 'host') {
            if (u.jitsiRoomName) currentJitsiRoomName = u.jitsiRoomName;
            if (u.jitsiDomain) currentJitsiDomain = u.jitsiDomain;
            const hMode = (u.videoMode === 'livekit' || u.videoEngine === 'livekit') ? 'livekit' : 'jitsi';
            if (hMode !== currentVideoMode && isAdmittedToClass) {
              if (typeof startStudentVideoEngine === 'function') {
                startStudentVideoEngine(hMode);
              }
            }`;

  const studentPresHostNew = `          if (key === 'host' || u.role === 'host') {
            if (u.vdoRoom) currentVDORoomName = u.vdoRoom;
            if (u.jitsiRoomName) currentVDORoomName = u.jitsiRoomName;
            const hMode = (u.videoMode === 'livekit' || u.videoEngine === 'livekit') ? 'livekit' : 'vdo';
            if (hMode !== currentVideoMode && isAdmittedToClass) {
              if (typeof startStudentVideoEngine === 'function') {
                startStudentVideoEngine(hMode);
              }
            }`;

  if (!content.includes(studentPresHostOld)) {
    throw new Error('Student presence host block match failed');
  }
  content = content.replace(studentPresHostOld, studentPresHostNew);

  // 2.3 Update WAITING_ROOM_ADMIT in student.html (around line 2125)
  const studentAdmitOld = `      myChannel.on('broadcast', { event: 'WAITING_ROOM_ADMIT' }, ({ payload }) => {
        if (!payload) return;
        const targetId = payload.studentId;
        const targetName = (payload.studentName || '').trim().toLowerCase();
        const currentName = (myName || '').trim().toLowerCase();

        if (payload.jitsiRoomName) currentJitsiRoomName = payload.jitsiRoomName;
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
        } else {`;

  const studentAdmitNew = `      myChannel.on('broadcast', { event: 'WAITING_ROOM_ADMIT' }, ({ payload }) => {
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

  if (!content.includes(studentAdmitOld)) {
    throw new Error('Student WAITING_ROOM_ADMIT match failed');
  }
  content = content.replace(studentAdmitOld, studentAdmitNew);

  // 2.4 Replace Jitsi implementation in Student (around lines 4985-5075)
  const studentJitsiSectionOld = `    // Estados de Conexión LiveKit Cloud SFU y Jitsi SFU
    let livekitRoom = null;
    let livekitUrl = null;
    let livekitToken = null;
    let isConnectingLiveKit = false;

    let currentJitsiRoomName = null;
    let currentJitsiDomain = 'meet.jit.si';
    let jitsiScriptLoaded = false;
    let jitsiApiInstance = null;

    async function loadJitsiScript() {
      if (window.JitsiMeetExternalAPI) return true;
      if (jitsiScriptLoaded) return true;

      return new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://meet.jit.si/external_api.js';
        s.async = true;
        s.onload = () => { jitsiScriptLoaded = true; resolve(true); };
        s.onerror = (e) => {
          console.error('[Jitsi] Error cargando external_api.js desde meet.jit.si:', e);
          resolve(false);
        };
        document.head.appendChild(s);
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
              disableDeepLinking: true,
              prejoinPageEnabled: false,
              startWithAudioMuted: true,
              startWithVideoMuted: true,
              toolbarButtons: ['microphone', 'camera'],
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
              TOOLBAR_BUTTONS: ['microphone', 'camera']
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

  const studentJitsiSectionNew = `    // Estados de Conexión LiveKit Cloud SFU y VDO.Ninja SFU
    let livekitRoom = null;
    let livekitUrl = null;
    let livekitToken = null;
    let isConnectingLiveKit = false;

    let currentVDORoomName = null;

    function mountVDONinjaStudent(containerEl, vdoRoom, displayName) {
      if (!containerEl || !vdoRoom) return null;
      containerEl.innerHTML = '';

      const safeName = displayName || myName || 'Alumno';
      const pushParam = \`Stu_\${encodeURIComponent(safeName)}_\${Math.floor(Math.random() * 999)}\`;
      const labelParam = encodeURIComponent(safeName);

      const iframeUrl = \`https://vdo.ninja/?room=\${encodeURIComponent(vdoRoom)}&push=\${pushParam}&label=\${labelParam}&cleanoutput&autostart&noheader&novideo\`;

      const iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.setAttribute('allow', 'camera; microphone; fullscreen; display-capture; autoplay');
      containerEl.appendChild(iframe);
      return iframe;
    }`;

  if (!content.includes(studentJitsiSectionOld)) {
    throw new Error('Student Jitsi section match failed');
  }
  content = content.replace(studentJitsiSectionOld, studentJitsiSectionNew);

  // 2.5 Update startStudentVideoEngine in student.html (around lines 5985-6050)
  const studentEngineOld = `    async function startStudentVideoEngine(mode) {
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
        // Modo Gratis Jitsi SFU (meet.jit.si)
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
          const jRoom = currentJitsiRoomName || ('ELTLive_' + (currentRoomPin || '0000') + '_session');
          await mountJitsiMeet(jitsiContainer, jRoom, myName || 'Alumno', currentJitsiDomain || 'meet.jit.si');
        }
      }
      updateLocalMediaUI();
    }`;

  const studentEngineNew = `    async function startStudentVideoEngine(mode) {
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

  if (!content.includes(studentEngineOld)) {
    throw new Error('Student startStudentVideoEngine match failed');
  }
  content = content.replace(studentEngineOld, studentEngineNew);

  // 2.6 Update ensureRemoteVideoCard guard
  content = content.replace(
    "if (currentVideoMode === 'jitsi') return null;",
    "if (currentVideoMode === 'vdo' || currentVideoMode === 'jitsi') return null;"
  );

  // 2.7 Update VIDEO_MODE_CONFIG listener in student.html (around line 6580)
  const studentBroadcastOld = `      channel.on('broadcast', { event: 'VIDEO_MODE_CONFIG' }, async ({ payload }) => {
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

  const studentBroadcastNew = `      channel.on('broadcast', { event: 'VIDEO_MODE_CONFIG' }, async ({ payload }) => {
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

  if (!content.includes(studentBroadcastOld)) {
    throw new Error('Student VIDEO_MODE_CONFIG match failed');
  }
  content = content.replace(studentBroadcastOld, studentBroadcastNew);

  if (isCrlf) {
    content = content.replace(/\n/g, '\r\n');
  }
  return content;
}

// Read sources
const hostSrc = fs.readFileSync('host.html', 'utf8');
const studentSrc = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');

const updatedHost = updateHost(hostSrc);
const updatedStudent = updateStudent(studentSrc);

fs.writeFileSync('host.html', updatedHost, 'utf8');
fs.writeFileSync('ELT LIVE WEB/student.html', updatedStudent, 'utf8');
fs.writeFileSync('ELT LIVE WEB/index.html', updatedStudent, 'utf8');
fs.writeFileSync('student.html', updatedStudent, 'utf8');

console.log('Successfully replaced Jitsi with VDO.Ninja across host.html, ELT LIVE WEB/student.html, ELT LIVE WEB/index.html, student.html');

