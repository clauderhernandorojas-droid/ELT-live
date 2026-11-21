const fs = require('fs');
const path = require('path');

const studentPath = path.resolve(__dirname, '..', 'ELT LIVE WEB', 'student.html');
const studentIndexPath = path.resolve(__dirname, '..', 'ELT LIVE WEB', 'index.html');
const studentRootPath = path.resolve(__dirname, '..', 'student.html');

let student = fs.readFileSync(studentPath, 'utf8');
const isStudentCRLF = student.includes('\r\n');
student = student.replace(/\r\n/g, '\n');

console.log('Normalized LF student length:', student.length);

// ==========================================
// 1. ESTILOS CSS PARA MODO GALERÍA ZOOM Y TRANSICIONES SUAVES
// ==========================================
const oldStyleStart = `<style>
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: #020617;
      -webkit-tap-highlight-color: transparent;
    }`;

const galleryCss = `<style>
    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background-color: #020617;
      -webkit-tap-highlight-color: transparent;
    }
    /* Estilos del Modo Galería tipo Zoom (cuando no hay lección/pizarra/screen share) */
    #webrtcVideoStrip.gallery-mode {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      bottom: 0 !important;
      right: 0 !important;
      left: 0 !important;
      top: 0 !important;
      transform: none !important;
      border: 0 !important;
      border-radius: 0 !important;
      background-color: #0a0c10 !important;
      padding: 16px !important;
      z-index: 25 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      box-shadow: none !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcDragHandle,
    #webrtcVideoStrip.gallery-mode #btnMinimizeVideoStrip {
      display: none !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcStripExpandedBody {
      width: 100% !important;
      height: 100% !important;
      display: grid !important;
      gap: 16px !important;
      justify-content: center !important;
      align-content: center !important;
      justify-items: center !important;
      align-items: center !important;
      overflow: hidden !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcRemoteCards {
      display: contents !important;
    }
    /* Cuadrícula Galería Zoom: 1 participante (centrado) */
    #webrtcVideoStrip.gallery-mode #webrtcStripExpandedBody.gallery-count-1 {
      grid-template-columns: minmax(280px, 860px) !important;
      grid-template-rows: minmax(180px, 82%) !important;
    }
    /* Cuadrícula Galería Zoom: 2 participantes (50% / 50% lado a lado) */
    #webrtcVideoStrip.gallery-mode #webrtcStripExpandedBody.gallery-count-2 {
      grid-template-columns: repeat(2, minmax(220px, 1fr)) !important;
      grid-template-rows: minmax(180px, 82%) !important;
    }
    @media (max-width: 640px) {
      #webrtcVideoStrip.gallery-mode #webrtcStripExpandedBody.gallery-count-2 {
        grid-template-columns: 1fr !important;
        grid-template-rows: repeat(2, minmax(160px, 1fr)) !important;
      }
    }
    /* Cuadrícula Galería Zoom: 3 o 4 participantes (2x2) */
    #webrtcVideoStrip.gallery-mode #webrtcStripExpandedBody.gallery-count-3,
    #webrtcVideoStrip.gallery-mode #webrtcStripExpandedBody.gallery-count-4 {
      grid-template-columns: repeat(2, minmax(200px, 1fr)) !important;
      grid-template-rows: repeat(2, minmax(140px, 1fr)) !important;
    }
    /* Cuadrícula Galería Zoom: 5 o más participantes (3x2 / 3x3) */
    #webrtcVideoStrip.gallery-mode #webrtcStripExpandedBody.gallery-count-many {
      grid-template-columns: repeat(3, minmax(160px, 1fr)) !important;
      grid-template-rows: repeat(auto-fit, minmax(120px, 1fr)) !important;
    }
    /* Tarjetas en Modo Galería: ocupan todo el espacio de su celda */
    #webrtcVideoStrip.gallery-mode #webrtcLocalCard,
    #webrtcVideoStrip.gallery-mode [id^="webrtcCard_"] {
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      aspect-ratio: 16 / 9 !important;
      border-radius: 14px !important;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4) !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcLocalNameTag,
    #webrtcVideoStrip.gallery-mode [data-role="name"] {
      font-size: 12px !important;
      padding: 3px 8px !important;
      border-radius: 6px !important;
      bottom: 8px !important;
      left: 8px !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcLocalAvatarInitial,
    #webrtcVideoStrip.gallery-mode [data-role="placeholder"] .rounded-full {
      width: 68px !important;
      height: 68px !important;
      font-size: 26px !important;
      border-width: 2px !important;
    }`;

if (!student.includes(oldStyleStart)) {
  console.error('ERROR: oldStyleStart not found in student.html');
  process.exit(1);
}
student = student.replace(oldStyleStart, galleryCss);

// ==========================================
// 2. CHAT OCULTO POR DEFECTO EN MÓVILES Y BADGE DE NOTIFICACIÓN
// ==========================================
const oldZmIsHidden = 'let zmIsHidden = (window.innerWidth < 768);';
const newZmIsHidden = 'let zmIsHidden = (window.innerWidth <= 768);';

if (!student.includes(oldZmIsHidden)) {
  console.error('ERROR: oldZmIsHidden not found in student.html');
  process.exit(1);
}
student = student.replace(oldZmIsHidden, newZmIsHidden);

// Actualizar badges en updateChatLayoutMode()
const oldBadgeToggle = `        if (headerBadge) {
          headerBadge.textContent = zmUnreadCount;
          headerBadge.classList.remove('hidden');
        }
        if (titlePill) {
          titlePill.textContent = zmUnreadCount;
          titlePill.classList.remove('hidden');
        }
      } else {
        if (headerBadge) headerBadge.classList.add('hidden');
        if (titlePill) titlePill.classList.add('hidden');
      }`;

const newBadgeToggle = `        if (headerBadge) {
          headerBadge.textContent = zmUnreadCount;
          headerBadge.classList.remove('hidden');
        }
        if (titlePill) {
          titlePill.textContent = zmUnreadCount;
          titlePill.classList.remove('hidden');
        }
        const bottomBadge = document.getElementById('bottomChatUnreadBadge');
        if (bottomBadge) {
          bottomBadge.textContent = zmUnreadCount;
          bottomBadge.classList.remove('hidden');
        }
      } else {
        if (headerBadge) headerBadge.classList.add('hidden');
        if (titlePill) titlePill.classList.add('hidden');
        const bottomBadge = document.getElementById('bottomChatUnreadBadge');
        if (bottomBadge) bottomBadge.classList.add('hidden');
      }`;

if (!student.includes(oldBadgeToggle)) {
  console.error('ERROR: oldBadgeToggle not found in student.html');
  process.exit(1);
}
student = student.replace(oldBadgeToggle, newBadgeToggle);

// Incluir bottomChatUnreadBadge en el botón Chat de la barra inferior
const oldBottomChatBtn = `<button id="bottomChatToggleBtn" type="button" class="group flex flex-col items-center justify-center px-2.5 py-1 rounded-lg hover:bg-white/10 transition relative" title="Mostrar / Ocultar el panel de chat">
                <div class="flex items-center gap-1 relative">
                  <i class="fa-regular fa-comment-dots text-sm text-slate-100"></i>
                  <span id="headerChatUnreadBadge" class="hidden absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">0</span>
                </div>
                <span class="text-[10px] text-slate-300 font-medium mt-0.5">Chat</span>
              </button>`;

const newBottomChatBtn = `<button id="bottomChatToggleBtn" type="button" class="group flex flex-col items-center justify-center px-2.5 py-1 rounded-lg hover:bg-white/10 transition relative" title="Mostrar / Ocultar el panel de chat">
                <div class="flex items-center gap-1 relative">
                  <i class="fa-regular fa-comment-dots text-sm text-slate-100"></i>
                  <span id="headerChatUnreadBadge" class="hidden absolute -top-1.5 -right-2.5 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">0</span>
                  <span id="bottomChatUnreadBadge" class="hidden absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full animate-pulse shadow">0</span>
                </div>
                <span class="text-[10px] text-slate-300 font-medium mt-0.5">Chat</span>
              </button>`;

if (!student.includes(oldBottomChatBtn)) {
  console.error('ERROR: oldBottomChatBtn not found in student.html');
  process.exit(1);
}
student = student.replace(oldBottomChatBtn, newBottomChatBtn);


// ==========================================
// 3. CONTROLADOR DE MODO GALERÍA ZOOM AUTOMÁTICO
// ==========================================

const galleryControllerFunctions = `
    // ==================== MODO GALERÍA TIPO ZOOM / COMPACTO AUTOMÁTICO ====================
    let isGalleryModeActive = false;

    function hasActiveSharedContent() {
      // 1. Hay lección activa si waitingCover está oculto
      const waitingCover = document.getElementById('waitingCover');
      const hasLesson = Boolean(waitingCover && waitingCover.classList.contains('hidden'));

      // 2. Hay Pizarra Colaborativa activa
      const hasWhiteboard = Boolean(typeof wbIsOpen !== 'undefined' && wbIsOpen);

      // 3. Hay pantalla compartida en vivo (remota o local)
      const stageOverlay = document.getElementById('remoteScreenShareOverlay');
      const hasScreenShare = Boolean(
        (typeof isSharingScreen !== 'undefined' && isSharingScreen) ||
        (typeof window.__remoteScreenSharingActive !== 'undefined' && window.__remoteScreenSharingActive) ||
        (stageOverlay && !stageOverlay.classList.contains('hidden'))
      );

      return hasLesson || hasWhiteboard || hasScreenShare;
    }

    function syncVideoGalleryMode() {
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
    }
`;

// Insertar galleryControllerFunctions justo antes de updateMinimizedVideoStripSummary
if (!student.includes('function syncVideoGalleryMode()')) {
  student = student.replace('function updateMinimizedVideoStripSummary()', galleryControllerFunctions + '\n    function updateMinimizedVideoStripSummary()');
}

// Actualizar drag mousedown para no arrastrar cuando esté en gallery-mode
const oldMouseDown = `strip.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('button, #webrtcLocalControls, #btnMinimizeVideoStrip, #btnRestoreVideoStrip')) return;`;

const newMouseDown = `strip.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || isGalleryModeActive) return;
        if (e.target.closest('button, #webrtcLocalControls, #btnMinimizeVideoStrip, #btnRestoreVideoStrip')) return;`;

if (!student.includes(oldMouseDown)) {
  console.error('ERROR: oldMouseDown not found in student.html');
  process.exit(1);
}
student = student.replace(oldMouseDown, newMouseDown);

// Actualizar drag touchstart para no arrastrar cuando esté en gallery-mode
const oldTouchStart = `strip.addEventListener('touchstart', (e) => {
        if (e.target.closest('button, #webrtcLocalControls, #btnMinimizeVideoStrip, #btnRestoreVideoStrip')) return;`;

const newTouchStart = `strip.addEventListener('touchstart', (e) => {
        if (isGalleryModeActive) return;
        if (e.target.closest('button, #webrtcLocalControls, #btnMinimizeVideoStrip, #btnRestoreVideoStrip')) return;`;

if (!student.includes(oldTouchStart)) {
  console.error('ERROR: oldTouchStart not found in student.html');
  process.exit(1);
}
student = student.replace(oldTouchStart, newTouchStart);

// ==========================================
// 4. CONECTAR syncVideoGalleryMode A EVENTOS CLAVE
// ==========================================

// A) En loadLessonIntoStudent: al cargar lección
const oldLoadLesson = `      currentLoadedLessonId = lessonId || Date.now().toString();
      latestPostMessageAnswers = [];
      waitingCover.classList.add('hidden');`;

const newLoadLesson = `      currentLoadedLessonId = lessonId || Date.now().toString();
      latestPostMessageAnswers = [];
      waitingCover.classList.add('hidden');
      if (typeof syncVideoGalleryMode === 'function') syncVideoGalleryMode();`;

if (!student.includes(oldLoadLesson)) {
  console.error('ERROR: oldLoadLesson not found in student.html');
  process.exit(1);
}
student = student.replace(oldLoadLesson, newLoadLesson);

// B) En toggleWhiteboardView: al abrir o cerrar pizarra colaborativa
const oldToggleWb = `    function toggleWhiteboardView(forceState) {
      wbIsOpen = typeof forceState === 'boolean' ? forceState : !wbIsOpen;
      whiteboardView.classList.toggle('hidden', !wbIsOpen);`;

const newToggleWb = `    function toggleWhiteboardView(forceState) {
      wbIsOpen = typeof forceState === 'boolean' ? forceState : !wbIsOpen;
      whiteboardView.classList.toggle('hidden', !wbIsOpen);
      if (typeof syncVideoGalleryMode === 'function') syncVideoGalleryMode();`;

if (!student.includes(oldToggleWb)) {
  console.error('ERROR: oldToggleWb not found in student.html');
  process.exit(1);
}
student = student.replace(oldToggleWb, newToggleWb);

// C) En syncStudentRemoteScreenShareOverlay: al iniciar o terminar screen share
const oldScreenShareEnd = `        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        if (restoreStageBtn) restoreStageBtn.classList.add('hidden');
      }
    }`;

const newScreenShareEnd = `        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        if (restoreStageBtn) restoreStageBtn.classList.add('hidden');
      }
      if (typeof syncVideoGalleryMode === 'function') syncVideoGalleryMode();
    }`;

if (!student.includes(oldScreenShareEnd)) {
  console.error('ERROR: oldScreenShareEnd not found in student.html');
  process.exit(1);
}
student = student.replace(oldScreenShareEnd, newScreenShareEnd);

// D) En admitStudentToClass: al entrar formalmente a la clase
const oldAdmitStudent = `      if (typeof announceWebRTCPresence === 'function') {
        announceWebRTCPresence();
      }
    }`;

const newAdmitStudent = `      if (typeof announceWebRTCPresence === 'function') {
        announceWebRTCPresence();
      }
      if (typeof syncVideoGalleryMode === 'function') {
        syncVideoGalleryMode();
      }
    }`;

if (!student.includes(oldAdmitStudent)) {
  console.error('ERROR: oldAdmitStudent not found in student.html');
  process.exit(1);
}
student = student.replace(oldAdmitStudent, newAdmitStudent);

// E) En updateMinimizedVideoStripSummary: cada vez que entran o salen tarjetas de participantes
const oldUpdateMinimized = `window.setVideoStripMinimized = function(minimized) {`;

const newUpdateMinimized = `if (typeof syncVideoGalleryMode === 'function') {
        syncVideoGalleryMode();
      }
    }
window.setVideoStripMinimized = function(minimized) {`;

if (!student.includes(oldUpdateMinimized)) {
  console.error('ERROR: oldUpdateMinimized not found in student.html');
  process.exit(1);
}
student = student.replace(oldUpdateMinimized, newUpdateMinimized);


// Restaurar CRLF si corresponde
if (isStudentCRLF) {
  student = student.replace(/\n/g, '\r\n');
}

// ==========================================
// 5. GUARDAR Y SINCRONIZAR COPIAS IDÉNTICAS
// ==========================================
fs.writeFileSync(studentPath, student, 'utf8');
console.log('ELT LIVE WEB/student.html updated successfully.');

fs.writeFileSync(studentIndexPath, student, 'utf8');
console.log('ELT LIVE WEB/index.html synced successfully.');

fs.writeFileSync(studentRootPath, student, 'utf8');
console.log('student.html root synced successfully.');
