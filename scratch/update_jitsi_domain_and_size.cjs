const fs = require('fs');
const path = require('path');

const hostPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/host.html');
const studentPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/ELT LIVE WEB/student.html');
const indexPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/ELT LIVE WEB/index.html');
const rootStudentPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/student.html');

console.log('Reading files...');
let hostContent = fs.readFileSync(hostPath, 'utf8');
let studentContent = fs.readFileSync(studentPath, 'utf8');

const hostHadCRLF = hostContent.includes('\r\n');
const studentHadCRLF = studentContent.includes('\r\n');
hostContent = hostContent.replace(/\r\n/g, '\n');
studentContent = studentContent.replace(/\r\n/g, '\n');

// =========================================================================
// 1. ACTUALIZAR host.html
// =========================================================================

// 1.1 Cambiar tamaño de #jitsiDockContainer a compacto (320px x 185px) en host.html
hostContent = hostContent.replace(
  '<div id="jitsiDockContainer" class="w-80 h-48 md:w-96 md:h-56 rounded-xl overflow-hidden bg-black flex-shrink-0 hidden"></div>',
  '<div id="jitsiDockContainer" class="w-[320px] h-[185px] max-w-[320px] max-h-[185px] rounded-xl overflow-hidden bg-black flex-shrink-0 hidden"></div>'
);

// 1.2 Cambiar dominio a meet.jit.si en host.html
hostContent = hostContent.replace(
  "const JITSI_COMMUNITY_DOMAIN = 'meet.ffmuc.net';",
  "const JITSI_COMMUNITY_DOMAIN = 'meet.jit.si';"
);

// En loadJitsiScript de host.html
const hostLoadScriptTarget = `    async function loadJitsiScript() {
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
    }`;

const hostLoadScriptReplacement = `    async function loadJitsiScript() {
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
    }`;

if (hostContent.includes(hostLoadScriptTarget)) {
  hostContent = hostContent.replace(hostLoadScriptTarget, hostLoadScriptReplacement);
}

// 1.3 Ocultar tarjetas placeholder en host.html cuando el motor sea jitsi
const hostStartEngineTarget = `      } else {
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
      }`;

const hostStartEngineReplacement = `      } else {
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

        if (jitsiContainer) {
          jitsiContainer.classList.remove('hidden');
          const jRoom = getOrCreateJitsiRoomName();
          await mountJitsiMeet(jitsiContainer, jRoom, 'Profesor (Host)', JITSI_COMMUNITY_DOMAIN);
        }
      }`;

if (hostContent.includes(hostStartEngineTarget)) {
  hostContent = hostContent.replace(hostStartEngineTarget, hostStartEngineReplacement);
}

// Reemplazar cualquier mención residual de meet.ffmuc.net en host.html
hostContent = hostContent.replace(/meet\.ffmuc\.net/g, 'meet.jit.si');


// =========================================================================
// 2. ACTUALIZAR ELT LIVE WEB/student.html
// =========================================================================

// 2.1 Cambiar tamaño de #jitsiDockContainer a compacto responsivo móvil/desktop en student.html
studentContent = studentContent.replace(
  '<div id="jitsiDockContainer" class="w-72 h-44 sm:w-80 sm:h-48 rounded-xl overflow-hidden bg-black flex-shrink-0 hidden"></div>',
  '<div id="jitsiDockContainer" class="w-full sm:w-[320px] h-[155px] sm:h-[185px] max-w-[320px] max-h-[185px] rounded-xl overflow-hidden bg-black flex-shrink-0 hidden"></div>'
);

// 2.2 Cambiar dominio a meet.jit.si en student.html
studentContent = studentContent.replace(
  "let currentJitsiDomain = 'meet.ffmuc.net';",
  "let currentJitsiDomain = 'meet.jit.si';"
);

// En loadJitsiScript de student.html
const studentLoadScriptTarget = `    async function loadJitsiScript() {
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
    }`;

const studentLoadScriptReplacement = `    async function loadJitsiScript() {
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
    }`;

if (studentContent.includes(studentLoadScriptTarget)) {
  studentContent = studentContent.replace(studentLoadScriptTarget, studentLoadScriptReplacement);
}

// 2.3 En startStudentVideoEngine de student.html: ocultar tarjetas placeholder en modo jitsi
const studentStartEngineTarget = `      } else {
        // Modo Gratis Jitsi SFU (meet.ffmuc.net)
        if (livekitRoom) {
          try { await livekitRoom.disconnect(); } catch (e) {}
          livekitRoom = null;
        }
        if (localCard) localCard.classList.add('hidden');
        if (remoteCards) remoteCards.classList.add('hidden');

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

// Inspeccionar cómo quedó startStudentVideoEngine en student.html
// Reemplazar meet.ffmuc.net por meet.jit.si en todo student.html
studentContent = studentContent.replace(/meet\.ffmuc\.net/g, 'meet.jit.si');

// Ocultar tarjetas de profesor / compañeros si se llama ensureRemoteVideoCard en modo jitsi
studentContent = studentContent.replace(
  "      if (!strip || !remoteContainer || !remotePeerId) return null;",
  "      if (!strip || !remoteContainer || !remotePeerId) return null;\n      if (currentVideoMode === 'jitsi') return null;"
);

// Restaurar finales de línea
if (hostHadCRLF) hostContent = hostContent.replace(/\n/g, '\r\n');
if (studentHadCRLF) studentContent = studentContent.replace(/\n/g, '\r\n');

// Guardar
fs.writeFileSync(hostPath, hostContent, 'utf8');
fs.writeFileSync(studentPath, studentContent, 'utf8');
fs.writeFileSync(indexPath, studentContent, 'utf8');
fs.writeFileSync(rootStudentPath, studentContent, 'utf8');

console.log('Domain and compact size adjustments applied successfully!');

