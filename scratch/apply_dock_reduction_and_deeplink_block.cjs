const fs = require('fs');
const path = require('path');

const hostPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/host.html');
const studentPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/ELT LIVE WEB/student.html');
const indexPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/ELT LIVE WEB/index.html');
const rootStudentPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/student.html');
const mainPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/main.js');
const mainHostPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/main-host.js');
const mainStudentPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/main-student.js');

console.log('Reading files...');
let hostContent = fs.readFileSync(hostPath, 'utf8');
let studentContent = fs.readFileSync(studentPath, 'utf8');

const hostHadCRLF = hostContent.includes('\r\n');
const studentHadCRLF = studentContent.includes('\r\n');
hostContent = hostContent.replace(/\r\n/g, '\n');
studentContent = studentContent.replace(/\r\n/g, '\n');

// =========================================================================
// 1. ELECTRON MAIN FILES: BLOQUEAR PROTOCOLO jitsi-meet://
// =========================================================================
function patchElectronMain(filePath) {
  if (!fs.existsSync(filePath)) return;
  let code = fs.readFileSync(filePath, 'utf8');
  if (code.includes("url.startsWith('jitsi-meet://')")) {
    console.log(`Already patched: ${path.basename(filePath)}`);
    return;
  }
  const hadCR = code.includes('\r\n');
  code = code.replace(/\r\n/g, '\n');

  // Insertar interceptor en app.on('web-contents-created')
  const hookCode = `
// Bloqueo de deep linking y protocolos externos como jitsi-meet://
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (navEvent, url) => {
    if (typeof url === 'string' && url.startsWith('jitsi-meet://')) {
      navEvent.preventDefault();
    }
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (typeof url === 'string' && url.startsWith('jitsi-meet://')) {
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
});
`;

  code = code + hookCode;
  if (hadCR) code = code.replace(/\n/g, '\r\n');
  fs.writeFileSync(filePath, code, 'utf8');
  console.log(`Patched deep linking block in ${path.basename(filePath)}`);
}

patchElectronMain(mainPath);
patchElectronMain(mainHostPath);
patchElectronMain(mainStudentPath);

// =========================================================================
// 2. ACTUALIZAR host.html (CSS COMPACTO + configOverwrite toolbarButtons)
// =========================================================================

// 2.1 CSS para #webrtcVideoStrip.jitsi-mode en host.html
const hostCssTarget = '</style>';
const hostCssReplacement = `
    /* Reducción drástica del dock flotante en Modo Jitsi (260px x 150px) */
    #webrtcVideoStrip.jitsi-mode {
      max-width: 280px !important;
      width: auto !important;
      padding: 4px !important;
      border-radius: 12px !important;
    }
    #webrtcVideoStrip.jitsi-mode #jitsiDockContainer {
      width: 260px !important;
      height: 150px !important;
      max-width: 260px !important;
      max-height: 150px !important;
      border-radius: 8px !important;
      overflow: hidden !important;
    }
    #webrtcVideoStrip.jitsi-mode #webrtcStripExpandedBody {
      overflow: hidden !important;
      padding-right: 0 !important;
      gap: 4px !important;
    }
  </style>`;

if (!hostContent.includes('#webrtcVideoStrip.jitsi-mode')) {
  hostContent = hostContent.replace(hostCssTarget, hostCssReplacement);
}

// 2.2 Reemplazar HTML de jitsiDockContainer en host.html con estilo en línea estricto
hostContent = hostContent.replace(
  /<div id="jitsiDockContainer"[^>]*><\/div>/,
  '<div id="jitsiDockContainer" style="width: 260px; height: 150px; max-width: 260px; max-height: 150px; border-radius: 8px; overflow: hidden;" class="w-[260px] h-[150px] max-w-[260px] max-h-[150px] rounded-lg overflow-hidden bg-black flex-shrink-0 hidden"></div>'
);

// 2.3 Actualizar configOverwrite en mountJitsiMeet de host.html
const hostConfigTarget = `            configOverwrite: {
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
            }`;

const hostConfigReplacement = `            configOverwrite: {
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
            }`;

if (hostContent.includes(hostConfigTarget)) {
  hostContent = hostContent.replace(hostConfigTarget, hostConfigReplacement);
}

// 2.4 En startHostVideoEngine de host.html: añadir clase jitsi-mode a webrtcVideoStrip
const hostStartEngineTarget = `        if (jitsiContainer) {
          jitsiContainer.classList.remove('hidden');
          const jRoom = getOrCreateJitsiRoomName();
          await mountJitsiMeet(jitsiContainer, jRoom, 'Profesor (Host)', JITSI_COMMUNITY_DOMAIN);
        }`;

const hostStartEngineReplacement = `        const strip = document.getElementById('webrtcVideoStrip');
        if (strip) strip.classList.add('jitsi-mode');

        if (jitsiContainer) {
          jitsiContainer.classList.remove('hidden');
          const jRoom = getOrCreateJitsiRoomName();
          await mountJitsiMeet(jitsiContainer, jRoom, 'Profesor (Host)', JITSI_COMMUNITY_DOMAIN);
        }`;

if (hostContent.includes(hostStartEngineTarget)) {
  hostContent = hostContent.replace(hostStartEngineTarget, hostStartEngineReplacement);
}

// En startHostVideoEngine para livekit: remover jitsi-mode
const hostLKStartEngineTarget = `        if (localCard) localCard.classList.remove('hidden');
        if (remoteCards) remoteCards.classList.remove('hidden');`;

const hostLKStartEngineReplacement = `        const stripLK = document.getElementById('webrtcVideoStrip');
        if (stripLK) stripLK.classList.remove('jitsi-mode');
        if (localCard) localCard.classList.remove('hidden');
        if (remoteCards) remoteCards.classList.remove('hidden');`;

if (hostContent.includes(hostLKStartEngineTarget)) {
  hostContent = hostContent.replace(hostLKStartEngineTarget, hostLKStartEngineReplacement);
}


// =========================================================================
// 3. ACTUALIZAR ELT LIVE WEB/student.html (CSS COMPACTO + configOverwrite)
// =========================================================================

// 3.1 CSS para #webrtcVideoStrip.jitsi-mode en student.html
const studentCssTarget = '</style>';
const studentCssReplacement = `
    /* Reducción drástica del dock flotante en Modo Jitsi (260px x 150px) */
    #webrtcVideoStrip.jitsi-mode {
      max-width: 280px !important;
      width: auto !important;
      padding: 4px !important;
      border-radius: 12px !important;
    }
    #webrtcVideoStrip.jitsi-mode #jitsiDockContainer {
      width: 260px !important;
      height: 150px !important;
      max-width: 260px !important;
      max-height: 150px !important;
      border-radius: 8px !important;
      overflow: hidden !important;
    }
    #webrtcVideoStrip.jitsi-mode #webrtcStripExpandedBody {
      overflow: hidden !important;
      padding-right: 0 !important;
      gap: 4px !important;
    }
    @media (max-width: 640px) {
      #webrtcVideoStrip.jitsi-mode {
        max-width: 95vw !important;
        width: auto !important;
      }
      #webrtcVideoStrip.jitsi-mode #jitsiDockContainer {
        width: 260px !important;
        height: 150px !important;
        max-width: 260px !important;
        max-height: 150px !important;
        border-radius: 8px !important;
        overflow: hidden !important;
      }
    }
  </style>`;

if (!studentContent.includes('#webrtcVideoStrip.jitsi-mode')) {
  studentContent = studentContent.replace(studentCssTarget, studentCssReplacement);
}

// 3.2 Reemplazar HTML de jitsiDockContainer en student.html con estilo en línea estricto
studentContent = studentContent.replace(
  /<div id="jitsiDockContainer"[^>]*><\/div>/,
  '<div id="jitsiDockContainer" style="width: 260px; height: 150px; max-width: 260px; max-height: 150px; border-radius: 8px; overflow: hidden;" class="w-[260px] h-[150px] max-w-[260px] max-h-[150px] rounded-lg overflow-hidden bg-black flex-shrink-0 hidden"></div>'
);

// 3.3 Actualizar configOverwrite en mountJitsiMeet de student.html
const studentConfigTarget = `            configOverwrite: {
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
            }`;

const studentConfigReplacement = `            configOverwrite: {
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
            }`;

if (studentContent.includes(studentConfigTarget)) {
  studentContent = studentContent.replace(studentConfigTarget, studentConfigReplacement);
}

// 3.4 En startStudentVideoEngine de student.html: añadir clase jitsi-mode a webrtcVideoStrip
const studentStartEngineTarget = `        if (jitsiContainer) {
          jitsiContainer.classList.remove('hidden');
          const jRoom = currentJitsiRoomName || ('ELTLive_' + (currentRoomPin || '0000') + '_session');
          await mountJitsiMeet(jitsiContainer, jRoom, myName || 'Alumno', currentJitsiDomain || 'meet.jit.si');
        }`;

const studentStartEngineReplacement = `        const strip = document.getElementById('webrtcVideoStrip');
        if (strip) strip.classList.add('jitsi-mode');

        if (jitsiContainer) {
          jitsiContainer.classList.remove('hidden');
          const jRoom = currentJitsiRoomName || ('ELTLive_' + (currentRoomPin || '0000') + '_session');
          await mountJitsiMeet(jitsiContainer, jRoom, myName || 'Alumno', currentJitsiDomain || 'meet.jit.si');
        }`;

if (studentContent.includes(studentStartEngineTarget)) {
  studentContent = studentContent.replace(studentStartEngineTarget, studentStartEngineReplacement);
}

// En startStudentVideoEngine para livekit: remover jitsi-mode
const studentLKStartEngineTarget = `        if (localCard) localCard.classList.remove('hidden');
        if (remoteCards) remoteCards.classList.remove('hidden');
        const expandedBodyLK = document.getElementById('webrtcStripExpandedBody');
        if (expandedBodyLK) {
          expandedBodyLK.querySelectorAll('[data-peer-id], [data-student-name]').forEach(c => c.classList.remove('hidden'));
        }`;

const studentLKStartEngineReplacement = `        const stripLK = document.getElementById('webrtcVideoStrip');
        if (stripLK) stripLK.classList.remove('jitsi-mode');
        if (localCard) localCard.classList.remove('hidden');
        if (remoteCards) remoteCards.classList.remove('hidden');
        const expandedBodyLK = document.getElementById('webrtcStripExpandedBody');
        if (expandedBodyLK) {
          expandedBodyLK.querySelectorAll('[data-peer-id], [data-student-name]').forEach(c => c.classList.remove('hidden'));
        }`;

if (studentContent.includes(studentLKStartEngineTarget)) {
  studentContent = studentContent.replace(studentLKStartEngineTarget, studentLKStartEngineReplacement);
}

// Restaurar finales de línea
if (hostHadCRLF) hostContent = hostContent.replace(/\n/g, '\r\n');
if (studentHadCRLF) studentContent = studentContent.replace(/\n/g, '\r\n');

// Guardar
fs.writeFileSync(hostPath, hostContent, 'utf8');
fs.writeFileSync(studentPath, studentContent, 'utf8');
fs.writeFileSync(indexPath, studentContent, 'utf8');
fs.writeFileSync(rootStudentPath, studentContent, 'utf8');

console.log('Dock reduction and deep-linking blocks applied successfully!');

