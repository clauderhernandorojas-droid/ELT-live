const fs = require('fs');
const path = require('path');

const studentFile = path.join(__dirname, '../ELT LIVE WEB/student.html');
let content = fs.readFileSync(studentFile, 'utf8');

content = content.replace(/\r\n/g, '\n');

// 1. In HTML: ensure zmChatDockSlot has class "hidden" by default
const oldAside = '<aside id="zmChatDockSlot" class="relative w-[325px] h-full flex-shrink-0 flex flex-col border-l border-[#2c2e33] bg-[#1a1a1a]">';
const newAside = '<aside id="zmChatDockSlot" class="hidden relative w-[325px] h-full flex-shrink-0 flex flex-col border-l border-[#2c2e33] bg-[#1a1a1a]">';

if (!content.includes(oldAside)) {
  console.error('Could not find oldAside');
  process.exit(1);
}
content = content.replace(oldAside, newAside);
console.log('1. zmChatDockSlot class="hidden" updated in HTML.');

// 2. In CSS: update @media (max-width: 768px)
const oldMediaCss = `    @media (max-width: 768px) {
      #zmChatDockSlot {
        position: absolute !important;
        right: 0 !important;
        top: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        max-width: 100vw !important;
        z-index: 70 !important;
        box-shadow: -4px 0 25px rgba(0, 0, 0, 0.6);
      }
      #zmChatDockResizeLeft {
        display: none !important;
      }
      #webrtcVideoStrip {
        max-width: 95% !important;
      }
    }`;

const newMediaCss = `    @media (max-width: 768px) {
      #zmChatDockSlot {
        position: absolute !important;
        right: 0 !important;
        top: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        max-width: 100vw !important;
        z-index: 70 !important;
        box-shadow: -4px 0 25px rgba(0, 0, 0, 0.6);
      }
      #zmChatDockSlot.hidden,
      #zmChatDockSlot[style*="display: none"] {
        display: none !important;
      }
      #zmChatDockResizeLeft {
        display: none !important;
      }
      #webrtcVideoStrip {
        max-width: 95% !important;
      }
      /* Modo Galería Zoom en pantallas móviles (max-width: 768px): tarjetas al 100% de ancho repartiendo el alto completo */
      #webrtcVideoStrip.gallery-mode {
        padding: 8px !important;
      }
      #webrtcVideoStrip.gallery-mode #webrtcStripExpandedBody {
        gap: 8px !important;
      }
      /* 1 participante en móvil: 100% ancho y centrado */
      #webrtcVideoStrip.gallery-mode #webrtcStripExpandedBody.gallery-count-1 {
        grid-template-columns: 1fr !important;
        grid-template-rows: 1fr !important;
      }
      /* 2 participantes en móvil vertical: apilados verticalmente (100% ancho, 50%/50% alto completo) */
      #webrtcVideoStrip.gallery-mode #webrtcStripExpandedBody.gallery-count-2 {
        grid-template-columns: 1fr !important;
        grid-template-rows: 1fr 1fr !important;
      }
      /* 3 o 4 participantes en móvil: cuadrícula 2x2 */
      #webrtcVideoStrip.gallery-mode #webrtcStripExpandedBody.gallery-count-3,
      #webrtcVideoStrip.gallery-mode #webrtcStripExpandedBody.gallery-count-4 {
        grid-template-columns: repeat(2, 1fr) !important;
        grid-template-rows: repeat(2, 1fr) !important;
      }
      /* Tarjetas en móvil: ocupan todo el ancho y alto asignado por la fila de la cuadrícula */
      #webrtcVideoStrip.gallery-mode #webrtcLocalCard,
      #webrtcVideoStrip.gallery-mode [id^="webrtcCard_"] {
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        aspect-ratio: auto !important;
      }
    }`;

if (!content.includes(oldMediaCss)) {
  console.error('Could not find oldMediaCss');
  process.exit(1);
}
content = content.replace(oldMediaCss, newMediaCss);
console.log('2. @media (max-width: 768px) CSS updated.');

// 3. In updateChatLayoutMode: ensure display: none !important when zmIsHidden, removeProperty when not
const oldChatHide = `      // Estado 1: Chat Cerrado / Oculto
      if (zmIsHidden) {
        if (zmChatWindow.parentElement !== zmChatDockSlot) {
          zmChatDockSlot.appendChild(zmChatWindow);
        }
        zmChatWindow.style.position = '';
        zmChatWindow.style.left = '';
        zmChatWindow.style.top = '';
        zmChatWindow.style.right = '';
        zmChatWindow.style.bottom = '';
        zmChatWindow.style.width = '100%';
        zmChatWindow.style.height = '100%';
        zmChatWindow.style.zIndex = '';
        zmChatWindow.classList.add('hidden');
        zmChatDockSlot.classList.add('hidden');
        zmChatBody.classList.remove('hidden');
        return;
      }

      zmChatWindow.classList.remove('hidden');`;

const newChatHide = `      // Estado 1: Chat Cerrado / Oculto
      if (zmIsHidden) {
        if (zmChatWindow.parentElement !== zmChatDockSlot) {
          zmChatDockSlot.appendChild(zmChatWindow);
        }
        zmChatWindow.style.position = '';
        zmChatWindow.style.left = '';
        zmChatWindow.style.top = '';
        zmChatWindow.style.right = '';
        zmChatWindow.style.bottom = '';
        zmChatWindow.style.width = '100%';
        zmChatWindow.style.height = '100%';
        zmChatWindow.style.zIndex = '';
        zmChatWindow.classList.add('hidden');
        zmChatWindow.style.setProperty('display', 'none', 'important');
        zmChatDockSlot.classList.add('hidden');
        zmChatDockSlot.style.setProperty('display', 'none', 'important');
        zmChatBody.classList.remove('hidden');
        return;
      }

      zmChatDockSlot.style.removeProperty('display');
      zmChatWindow.style.removeProperty('display');
      zmChatWindow.classList.remove('hidden');`;

if (!content.includes(oldChatHide)) {
  console.error('Could not find oldChatHide');
  process.exit(1);
}
content = content.replace(oldChatHide, newChatHide);
console.log('3. updateChatLayoutMode updated with display: none !important.');

// 4. In admitStudentToClass: ensure zmIsHidden = true on mobile and call updateChatLayoutMode()
const oldAdmitEnd = `      if (typeof announceWebRTCPresence === 'function') {
        announceWebRTCPresence();
      }
      if (typeof syncVideoGalleryMode === 'function') {
        syncVideoGalleryMode();
      }
    }`;

const newAdmitEnd = `      // En dispositivos móviles (window.innerWidth <= 768), garantizar que el chat inicie cerrado
      if (window.innerWidth <= 768) {
        zmIsHidden = true;
        zmIsMinimized = false;
        zmIsFloating = false;
      }
      if (typeof updateChatLayoutMode === 'function') {
        updateChatLayoutMode();
      }

      if (typeof announceWebRTCPresence === 'function') {
        announceWebRTCPresence();
      }
      if (typeof syncVideoGalleryMode === 'function') {
        syncVideoGalleryMode();
      }
    }`;

if (!content.includes(oldAdmitEnd)) {
  console.error('Could not find oldAdmitEnd');
  process.exit(1);
}
content = content.replace(oldAdmitEnd, newAdmitEnd);
console.log('4. admitStudentToClass updated with mobile chat closed enforcement.');

// 5. In chat initialization: call updateChatLayoutMode() on page load
const oldChatInitTarget = `    window.addEventListener('mouseup', () => {
      zmDragWinActive = false;
      zmResizeMode = null;
      zmResizeStartRect = null;
    });

    function setChatTarget(target) {`;

const newChatInitTarget = `    window.addEventListener('mouseup', () => {
      zmDragWinActive = false;
      zmResizeMode = null;
      zmResizeStartRect = null;
    });

    // Inicializar visualización del chat (en móviles cerrado por defecto)
    if (window.innerWidth <= 768) {
      zmIsHidden = true;
      zmIsMinimized = false;
      zmIsFloating = false;
    }
    updateChatLayoutMode();

    function setChatTarget(target) {`;

if (!content.includes(oldChatInitTarget)) {
  console.error('Could not find oldChatInitTarget');
  process.exit(1);
}
content = content.replace(oldChatInitTarget, newChatInitTarget);
console.log('5. Initial updateChatLayoutMode() call added.');

// 6. In window resize handler: also call updateChatLayoutMode()
const oldResize = `      window.addEventListener('resize', () => {
        clampVideoStripIntoBounds();
      });`;

const newResize = `      window.addEventListener('resize', () => {
        clampVideoStripIntoBounds();
        if (typeof updateChatLayoutMode === 'function') updateChatLayoutMode();
      });`;

if (!content.includes(oldResize)) {
  console.error('Could not find oldResize');
  process.exit(1);
}
content = content.replace(oldResize, newResize);
console.log('6. Window resize handler updated with updateChatLayoutMode.');

// 7. Save file and sync identically
fs.writeFileSync(studentFile, content, 'utf8');
console.log('ELT LIVE WEB/student.html saved successfully.');

const indexFile = path.join(__dirname, '../ELT LIVE WEB/index.html');
const rootStudentFile = path.join(__dirname, '../student.html');

fs.writeFileSync(indexFile, content, 'utf8');
fs.writeFileSync(rootStudentFile, content, 'utf8');
console.log('ELT LIVE WEB/index.html and student.html root synchronized identically.');
