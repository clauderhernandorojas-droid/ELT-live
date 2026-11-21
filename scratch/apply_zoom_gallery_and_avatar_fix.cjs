const fs = require('fs');
const path = require('path');

const studentFile = path.join(__dirname, '../ELT LIVE WEB/student.html');
let content = fs.readFileSync(studentFile, 'utf8');

// Normalize line endings to LF
content = content.replace(/\r\n/g, '\n');

// 1. Update CSS for gallery mode
const oldCssBlock = `    /* Estilos del Modo Galería tipo Zoom (cuando no hay lección/pizarra/screen share) */
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

const newCssBlock = `    /* Estilos del Modo Galería tipo Zoom (cuando no hay lección/pizarra/screen share) */
    #webrtcVideoStrip.gallery-mode {
      position: relative !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      flex: 1 1 0% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
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
    #webrtcVideoStrip.gallery-mode [id^="webrtcCard_"] {
      order: 1 !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcLocalCard {
      order: 2 !important;
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
    }
    #webrtcVideoStrip.gallery-mode #webrtcLocalPlaceholder:not(.hidden),
    #webrtcVideoStrip.gallery-mode [data-role="placeholder"]:not(.hidden) {
      width: 100% !important;
      height: 100% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcLocalPlaceholder.hidden,
    #webrtcVideoStrip.gallery-mode [data-role="placeholder"].hidden {
      display: none !important;
    }
    #webrtcVideoStrip.gallery-mode video:not(.hidden) {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      display: block !important;
    }
    #webrtcVideoStrip.gallery-mode video.hidden {
      display: none !important;
    }`;

if (!content.includes(oldCssBlock)) {
  console.error('Could not find oldCssBlock in student.html');
  process.exit(1);
}
content = content.replace(oldCssBlock, newCssBlock);
console.log('CSS block updated.');

// 2. Define hasLoadedLesson near currentLoadedLessonId
const oldVars = `let currentLoadedLessonId = null;
    let assignedSlide = 1;`;
const newVars = `let currentLoadedLessonId = null;
    let hasLoadedLesson = false;
    window.hasLoadedLesson = false;
    let assignedSlide = 1;`;
if (!content.includes(oldVars)) {
  console.error('Could not find oldVars');
  process.exit(1);
}
content = content.replace(oldVars, newVars);
console.log('hasLoadedLesson variable added.');

// 3. In loadLessonIntoStudent: set hasLoadedLesson = true; window.hasLoadedLesson = true;
const oldLoadLesson = `currentLoadedLessonId = lessonId || Date.now().toString();
      latestPostMessageAnswers = [];`;
const newLoadLesson = `currentLoadedLessonId = lessonId || Date.now().toString();
      hasLoadedLesson = true;
      window.hasLoadedLesson = true;
      latestPostMessageAnswers = [];`;
if (!content.includes(oldLoadLesson)) {
  console.error('Could not find oldLoadLesson');
  process.exit(1);
}
content = content.replace(oldLoadLesson, newLoadLesson);
console.log('loadLessonIntoStudent updated.');

// 4. Update hasActiveSharedContent and syncVideoGalleryMode
const oldGalleryLogic = `    // ==================== MODO GALERÍA TIPO ZOOM / COMPACTO AUTOMÁTICO ====================
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

const newGalleryLogic = `    // ==================== MODO GALERÍA TIPO ZOOM / COMPACTO AUTOMÁTICO ====================
    let isGalleryModeActive = false;

    function hasActiveSharedContent() {
      // 1. Hay lección interactiva .html realmente cargada (no simplemente que el iframe exista)
      const hasLesson = Boolean(
        (typeof hasLoadedLesson !== 'undefined' && hasLoadedLesson) ||
        (typeof window.hasLoadedLesson !== 'undefined' && window.hasLoadedLesson)
      );

      // 2. Hay Pizarra Colaborativa activa
      const hasWhiteboard = Boolean(typeof wbIsOpen !== 'undefined' && wbIsOpen);

      // 3. Hay pantalla compartida en vivo (remota o local)
      const stageOverlay = document.getElementById('remoteScreenShareOverlay');
      const hasScreenShare = Boolean(
        (typeof isSharingScreen !== 'undefined' && isSharingScreen) ||
        (typeof window.__remoteScreenSharingActive !== 'undefined' && window.__remoteScreenSharingActive) ||
        (stageOverlay && !stageOverlay.classList.contains('hidden') && stageOverlay.style.display !== 'none')
      );

      return hasLesson || hasWhiteboard || hasScreenShare;
    }

    function syncVideoGalleryMode() {
      const strip = document.getElementById('webrtcVideoStrip');
      const expandedBody = document.getElementById('webrtcStripExpandedBody');
      const frameContainer = document.getElementById('studentFrameContainer');
      const studentFrame = document.getElementById('studentFrame');
      const lessonFrame = document.getElementById('lessonFrame');
      const waitingCover = document.getElementById('waitingCover');
      const whiteboardView = document.getElementById('whiteboardView');
      const workspaceCol = document.getElementById('leftWorkspaceColumn');
      if (!strip || !expandedBody) return;

      const hasContent = hasActiveSharedContent();

      if (!hasContent) {
        // MODO GALERÍA GRANDE: Se expande ocupando el escenario completo sobre fondo oscuro
        isGalleryModeActive = true;
        strip.classList.add('gallery-mode');

        // Ocultar con !important todos los elementos del escenario didáctico blanco
        if (frameContainer) frameContainer.style.setProperty('display', 'none', 'important');
        if (studentFrame) studentFrame.style.setProperty('display', 'none', 'important');
        if (lessonFrame) lessonFrame.style.setProperty('display', 'none', 'important');
        if (waitingCover) waitingCover.style.setProperty('display', 'none', 'important');
        if (whiteboardView) whiteboardView.style.setProperty('display', 'none', 'important');

        if (workspaceCol) {
          workspaceCol.classList.remove('bg-white');
          workspaceCol.classList.add('bg-[#0a0c10]');
          workspaceCol.style.setProperty('background-color', '#0a0c10', 'important');
        }

        // Limpiar cualquier propiedad inline de posición o dimensiones para que las reglas CSS tomen el control
        ['top', 'left', 'right', 'bottom', 'width', 'height', 'transform', 'max-width', 'max-height'].forEach(prop => {
          strip.style.removeProperty(prop);
        });
        strip.style.top = '';
        strip.style.left = '';
        strip.style.right = '';
        strip.style.bottom = '';
        strip.style.width = '';
        strip.style.height = '';
        strip.style.transform = '';

        // Si estaba minimizado, restaurarlo en galería
        if (isVideoStripMinimized) {
          isVideoStripMinimized = false;
          const minPill = document.getElementById('webrtcStripMinimizedPill');
          if (minPill) { minPill.classList.add('hidden'); minPill.classList.remove('flex'); }
          expandedBody.classList.remove('hidden');
        }

        // Asegurar que exista la tarjeta del Profesor (Host) en #webrtcRemoteCards con avatar "P"
        if (typeof ensureRemoteVideoCard === 'function') {
          const hostPeerId = (window.__studentLatestPeerByKey && window.__studentLatestPeerByKey['__host__']) || 'host_presence';
          ensureRemoteVideoCard(hostPeerId, 'Profesor (Host)', 'host');
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

        // Restaurar display de los contenedores según corresponda
        if (frameContainer) {
          frameContainer.style.removeProperty('display');
          frameContainer.style.display = '';
        }
        if (studentFrame) {
          studentFrame.style.removeProperty('display');
          studentFrame.style.display = '';
        }
        if (lessonFrame) {
          lessonFrame.style.removeProperty('display');
          lessonFrame.style.display = '';
        }

        if (typeof wbIsOpen !== 'undefined' && wbIsOpen) {
          if (whiteboardView) {
            whiteboardView.style.removeProperty('display');
            whiteboardView.classList.remove('hidden');
          }
        } else {
          if (whiteboardView) {
            whiteboardView.style.setProperty('display', 'none', 'important');
            whiteboardView.classList.add('hidden');
          }
          if (hasLoadedLesson) {
            if (waitingCover) {
              waitingCover.style.setProperty('display', 'none', 'important');
              waitingCover.classList.add('hidden');
            }
          } else {
            if (waitingCover) {
              waitingCover.style.removeProperty('display');
              waitingCover.classList.remove('hidden');
            }
          }
        }

        if (workspaceCol) {
          workspaceCol.classList.remove('bg-[#0a0c10]');
          workspaceCol.classList.add('bg-white');
          workspaceCol.style.removeProperty('background-color');
        }

        // Restaurar posición flotante predeterminada si no tiene coordenadas personalizadas
        if (strip.style.left === '' && strip.style.top === '') {
          strip.style.bottom = '3.5rem';
          strip.style.right = '0.75rem';
        }
      }
    }`;

if (!content.includes(oldGalleryLogic)) {
  console.error('Could not find oldGalleryLogic');
  process.exit(1);
}
content = content.replace(oldGalleryLogic, newGalleryLogic);
console.log('Gallery logic updated.');

// 5. Guard clampVideoStripIntoBounds and applyLandscapePositionIfNeeded
const oldClamp = `function clampVideoStripIntoBounds() {
      const strip = document.getElementById('webrtcVideoStrip');`;
const newClamp = `function clampVideoStripIntoBounds() {
      if (isGalleryModeActive) return;
      const strip = document.getElementById('webrtcVideoStrip');`;
if (!content.includes(oldClamp)) {
  console.error('Could not find oldClamp');
  process.exit(1);
}
content = content.replace(oldClamp, newClamp);
console.log('clampVideoStripIntoBounds guarded.');

const oldLandscape = `function applyLandscapePositionIfNeeded() {
        const isLandscapeMobile = window.innerHeight <= 450 || (window.innerWidth <= 950 && window.innerHeight < window.innerWidth && window.innerHeight <= 480);
        if (isLandscapeMobile) {`;
const newLandscape = `function applyLandscapePositionIfNeeded() {
        if (isGalleryModeActive) return;
        const isLandscapeMobile = window.innerHeight <= 450 || (window.innerWidth <= 950 && window.innerHeight < window.innerWidth && window.innerHeight <= 480);
        if (isLandscapeMobile) {`;
if (!content.includes(oldLandscape)) {
  console.error('Could not find oldLandscape');
  process.exit(1);
}
content = content.replace(oldLandscape, newLandscape);
console.log('applyLandscapePositionIfNeeded guarded.');

// 6. Update ensureRemoteVideoCard so host card is always inside webrtcRemoteCards and has initial "P"
const oldEnsureRemoteCard = `      const expandedBody = document.getElementById('webrtcStripExpandedBody') || strip;
      const localCard = document.getElementById('webrtcLocalCard');
      if (resolvedRole === 'host') {
        expandedBody.insertBefore(card, localCard || expandedBody.firstChild);
      } else {
        remoteContainer.appendChild(card);
      }`;

const newEnsureRemoteCard = `      if (resolvedRole === 'host') {
        remoteContainer.insertBefore(card, remoteContainer.firstChild);
      } else {
        remoteContainer.appendChild(card);
      }`;

if (!content.includes(oldEnsureRemoteCard)) {
  console.error('Could not find oldEnsureRemoteCard');
  process.exit(1);
}
content = content.replace(oldEnsureRemoteCard, newEnsureRemoteCard);
console.log('ensureRemoteVideoCard placement updated.');

// Also ensure that existingCard in ensureRemoteVideoCard is relocated into remoteContainer if needed, and placeholder has initial
const oldExistingCardCheck = `      if (existingCard) {
        existingCard.id = \`webrtcCard_\${remotePeerId}\`;
        existingCard.setAttribute('data-peer-id', remotePeerId);
        if (dedupKey) existingCard.setAttribute('data-student-name', dedupKey);

        const videoEl = existingCard.querySelector('video');
        if (videoEl) {
          videoEl.setAttribute('playsinline', '');
          videoEl.setAttribute('webkit-playsinline', '');
          videoEl.setAttribute('autoplay', '');
        }
        const placeholderEl = existingCard.querySelector('[data-role="placeholder"]') || existingCard.querySelectorAll('div')[0];
        const nameTagEl = existingCard.querySelector('[data-role="name"]') || existingCard.querySelectorAll('div')[2];
        const micIconEl = existingCard.querySelector('[data-role="mute"]') || existingCard.querySelectorAll('div')[3];

        if (nameTagEl && resolvedName) nameTagEl.textContent = resolvedName;`;

const newExistingCardCheck = `      if (existingCard) {
        existingCard.id = \`webrtcCard_\${remotePeerId}\`;
        existingCard.setAttribute('data-peer-id', remotePeerId);
        if (dedupKey) existingCard.setAttribute('data-student-name', dedupKey);
        existingCard.setAttribute('data-peer-role', resolvedRole);

        if (existingCard.parentElement !== remoteContainer) {
          if (resolvedRole === 'host') {
            remoteContainer.insertBefore(existingCard, remoteContainer.firstChild);
          } else {
            remoteContainer.appendChild(existingCard);
          }
        }

        const videoEl = existingCard.querySelector('video');
        if (videoEl) {
          videoEl.setAttribute('playsinline', '');
          videoEl.setAttribute('webkit-playsinline', '');
          videoEl.setAttribute('autoplay', '');
        }
        let placeholderEl = existingCard.querySelector('[data-role="placeholder"]');
        const initial = (resolvedName || 'P').trim().charAt(0).toUpperCase() || 'P';
        const avatarColor = resolvedRole === 'host'
          ? 'bg-emerald-600/30 border-emerald-400/40 text-emerald-200'
          : 'bg-[#0e72ed]/30 border-[#0e72ed]/60 text-white';

        if (!placeholderEl) {
          placeholderEl = document.createElement('div');
          placeholderEl.setAttribute('data-role', 'placeholder');
          placeholderEl.className = 'flex flex-col items-center justify-center text-slate-400';
          placeholderEl.innerHTML = \`<div class="w-8 h-8 rounded-full \${avatarColor} border flex items-center justify-center font-bold text-xs mb-0.5">\${initial}</div>\`;
          existingCard.appendChild(placeholderEl);
        } else {
          placeholderEl.innerHTML = \`<div class="w-8 h-8 rounded-full \${avatarColor} border flex items-center justify-center font-bold text-xs mb-0.5">\${initial}</div>\`;
        }

        const nameTagEl = existingCard.querySelector('[data-role="name"]') || existingCard.querySelectorAll('div')[2];
        const micIconEl = existingCard.querySelector('[data-role="mute"]') || existingCard.querySelectorAll('div')[3];

        if (nameTagEl && resolvedName) nameTagEl.textContent = resolvedName;`;

if (!content.includes(oldExistingCardCheck)) {
  console.error('Could not find oldExistingCardCheck');
  process.exit(1);
}
content = content.replace(oldExistingCardCheck, newExistingCardCheck);
console.log('existingCard check updated.');

// 7. In updateStudentRemotePeerCardMedia, ensure phEl is visible with display: flex when camera is off
const oldUpdateMedia = `        const hasLiveVideo = (Boolean(peerObj.videoEnabled) || hasStreamLiveVideoTrack) && !peerObj.isSharingScreen;
        vidEl.classList.toggle('hidden', !hasLiveVideo);
        if (phEl) phEl.classList.toggle('hidden', hasLiveVideo);
        if (hasLiveVideo) {
          vidEl.play().catch(() => {});
        }`;

const newUpdateMedia = `        const hasLiveVideo = (Boolean(peerObj.videoEnabled) || hasStreamLiveVideoTrack) && !peerObj.isSharingScreen;
        vidEl.classList.toggle('hidden', !hasLiveVideo);
        if (phEl) {
          phEl.classList.toggle('hidden', hasLiveVideo);
          phEl.style.display = hasLiveVideo ? 'none' : 'flex';
        }
        if (hasLiveVideo) {
          vidEl.play().catch(() => {});
        }`;

if (!content.includes(oldUpdateMedia)) {
  console.error('Could not find oldUpdateMedia');
  process.exit(1);
}
content = content.replace(oldUpdateMedia, newUpdateMedia);
console.log('updateStudentRemotePeerCardMedia updated.');

// 8. In admitStudentToClass, ensure host card is created and presence is processed immediately
const oldAdmit = `      if (typeof updateLocalMediaUI === 'function') updateLocalMediaUI();

      // Iniciar el motor de video asignado SOLO AHORA que el estudiante fue formalmente admitido
      if (typeof startStudentVideoEngine === 'function') {
        await startStudentVideoEngine(assignedVideoMode);
      }`;

const newAdmit = `      if (typeof updateLocalMediaUI === 'function') updateLocalMediaUI();

      // Asegurar inmediatamente la tarjeta de Profesor (Host) en #webrtcRemoteCards con avatar "P"
      if (typeof ensureRemoteVideoCard === 'function') {
        const hostPeerId = (window.__studentLatestPeerByKey && window.__studentLatestPeerByKey['__host__']) || 'host_presence';
        ensureRemoteVideoCard(hostPeerId, 'Profesor (Host)', 'host');
      }

      // Iniciar el motor de video asignado SOLO AHORA que el estudiante fue formalmente admitido
      if (typeof startStudentVideoEngine === 'function') {
        await startStudentVideoEngine(assignedVideoMode);
      }`;

if (!content.includes(oldAdmit)) {
  console.error('Could not find oldAdmit');
  process.exit(1);
}
content = content.replace(oldAdmit, newAdmit);
console.log('admitStudentToClass updated.');

// 9. Write updated content to ELT LIVE WEB/student.html
fs.writeFileSync(studentFile, content, 'utf8');
console.log('ELT LIVE WEB/student.html written successfully.');

// 10. Sync identically to ELT LIVE WEB/index.html and student.html
const indexFile = path.join(__dirname, '../ELT LIVE WEB/index.html');
const rootStudentFile = path.join(__dirname, '../student.html');

fs.writeFileSync(indexFile, content, 'utf8');
fs.writeFileSync(rootStudentFile, content, 'utf8');
console.log('ELT LIVE WEB/index.html and student.html root synced identically.');
