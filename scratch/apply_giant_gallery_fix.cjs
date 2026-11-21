const fs = require('fs');
const path = require('path');

const studentFile = path.join(__dirname, '../ELT LIVE WEB/student.html');
let content = fs.readFileSync(studentFile, 'utf8');

content = content.replace(/\r\n/g, '\n');

// 1. Locate the gallery mode CSS block and replace it
const oldGalleryCssStart = '    /* Estilos del Modo Galería tipo Zoom (cuando no hay lección/pizarra/screen share) */';
const oldGalleryCssEnd = '    #wbViewport, #wbCanvas {';

const startIdx = content.indexOf(oldGalleryCssStart);
const endIdx = content.indexOf(oldGalleryCssEnd);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not locate gallery CSS block');
  process.exit(1);
}

const newGalleryCss = `    /* Estilos del Modo Galería tipo Zoom Gigante (cuando no hay lección/pizarra/screen share) */
    #webrtcVideoStrip.gallery-mode {
      display: grid !important;
      width: 100% !important;
      height: 100% !important;
      max-width: 100% !important;
      max-height: 100% !important;
      min-height: 50vh !important;
      margin: 0 !important;
      padding: 1.5rem !important;
      gap: 1.5rem !important;
      box-sizing: border-box !important;
      position: relative !important;
      inset: 0 !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      transform: none !important;
      border: 0 !important;
      border-radius: 0 !important;
      background-color: #0a0c10 !important;
      z-index: 25 !important;
      flex: 1 1 0% !important;
      box-shadow: none !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcDragHandle,
    #webrtcVideoStrip.gallery-mode #btnMinimizeVideoStrip {
      display: none !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcStripExpandedBody {
      width: 100% !important;
      height: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      display: grid !important;
      gap: 1.5rem !important;
      grid-column: 1 / -1 !important;
      grid-row: 1 / -1 !important;
      align-items: stretch !important;
      justify-items: stretch !important;
      overflow: hidden !important;
      /* Por defecto en PC para 1 o 2 participantes: lado a lado al 50%/50% */
      grid-template-columns: repeat(2, 1fr) !important;
      grid-template-rows: 1fr !important;
    }
    #webrtcVideoStrip.gallery-mode.gallery-count-1 #webrtcStripExpandedBody {
      grid-template-columns: 1fr !important;
      grid-template-rows: 1fr !important;
    }
    #webrtcVideoStrip.gallery-mode.gallery-count-2 #webrtcStripExpandedBody {
      grid-template-columns: repeat(2, 1fr) !important;
      grid-template-rows: 1fr !important;
    }
    #webrtcVideoStrip.gallery-mode.gallery-count-3 #webrtcStripExpandedBody,
    #webrtcVideoStrip.gallery-mode.gallery-count-4 #webrtcStripExpandedBody,
    #webrtcVideoStrip.gallery-mode.gallery-count-many #webrtcStripExpandedBody {
      grid-template-columns: repeat(2, 1fr) !important;
      grid-template-rows: repeat(2, 1fr) !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcRemoteCards {
      display: flex !important;
      width: 100% !important;
      height: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      gap: 1.5rem !important;
      align-items: stretch !important;
      justify-content: stretch !important;
      order: 1 !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcRemoteCards:empty {
      display: none !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcLocalCard {
      order: 2 !important;
      margin: 0 !important;
    }
    /* Tarjetas individuales dentro de la galería */
    #webrtcVideoStrip.gallery-mode #webrtcLocalCard,
    #webrtcVideoStrip.gallery-mode [id^="webrtcCard_"] {
      width: 100% !important;
      height: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      max-width: 100% !important;
      max-height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      border-radius: 12px !important;
      position: relative !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4) !important;
      background-color: #111317 !important;
      aspect-ratio: auto !important;
      flex: 1 1 0% !important;
    }
    /* Contenedores internos de video y placeholder/avatar estirados al 100% */
    #webrtcVideoStrip.gallery-mode #webrtcLocalPlaceholder,
    #webrtcVideoStrip.gallery-mode [data-role="placeholder"] {
      width: 100% !important;
      height: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      flex: 1 1 0% !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcLocalPlaceholder:not(.hidden),
    #webrtcVideoStrip.gallery-mode [data-role="placeholder"]:not(.hidden) {
      display: flex !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcLocalPlaceholder.hidden,
    #webrtcVideoStrip.gallery-mode [data-role="placeholder"].hidden {
      display: none !important;
    }
    #webrtcVideoStrip.gallery-mode video {
      width: 100% !important;
      height: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      object-fit: cover !important;
      flex: 1 1 0% !important;
    }
    #webrtcVideoStrip.gallery-mode video:not(.hidden) {
      display: block !important;
    }
    #webrtcVideoStrip.gallery-mode video.hidden {
      display: none !important;
    }
    /* Círculo de avatar grande y centrado */
    #webrtcVideoStrip.gallery-mode #webrtcLocalAvatarInitial,
    #webrtcVideoStrip.gallery-mode [data-role="placeholder"] .rounded-full {
      width: 90px !important;
      height: 90px !important;
      font-size: 36px !important;
      border-width: 3px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcLocalNameTag,
    #webrtcVideoStrip.gallery-mode [data-role="name"] {
      font-size: 13px !important;
      padding: 4px 10px !important;
      border-radius: 6px !important;
      bottom: 12px !important;
      left: 12px !important;
      z-index: 20 !important;
    }
`;

content = content.slice(0, startIdx) + newGalleryCss + content.slice(endIdx);
console.log('Gallery CSS updated successfully.');

// 2. Also update @media (max-width: 768px) gallery section
const oldMediaMax768 = `      /* Modo Galería Zoom en pantallas móviles (max-width: 768px): tarjetas al 100% de ancho repartiendo el alto completo */
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
      }`;

const newMediaMax768 = `      /* Modo Galería Zoom en pantallas móviles (max-width: 768px): tarjetas al 100% de ancho repartiendo el alto completo */
      #webrtcVideoStrip.gallery-mode {
        padding: 0.75rem !important;
        gap: 0.75rem !important;
      }
      #webrtcVideoStrip.gallery-mode #webrtcStripExpandedBody {
        gap: 0.75rem !important;
        grid-template-columns: 1fr !important;
        grid-template-rows: repeat(2, 1fr) !important;
      }
      #webrtcVideoStrip.gallery-mode #webrtcRemoteCards {
        flex-direction: column !important;
        gap: 0.75rem !important;
      }
      /* 1 participante en móvil: 100% ancho y alto */
      #webrtcVideoStrip.gallery-mode.gallery-count-1 #webrtcStripExpandedBody {
        grid-template-columns: 1fr !important;
        grid-template-rows: 1fr !important;
      }
      /* 2 participantes en móvil vertical: apilados al 100% ancho y 50%/50% alto */
      #webrtcVideoStrip.gallery-mode.gallery-count-2 #webrtcStripExpandedBody {
        grid-template-columns: 1fr !important;
        grid-template-rows: repeat(2, 1fr) !important;
      }
      /* 3 o 4 participantes en móvil: cuadrícula 2x2 */
      #webrtcVideoStrip.gallery-mode.gallery-count-3 #webrtcStripExpandedBody,
      #webrtcVideoStrip.gallery-mode.gallery-count-4 #webrtcStripExpandedBody,
      #webrtcVideoStrip.gallery-mode.gallery-count-many #webrtcStripExpandedBody {
        grid-template-columns: repeat(2, 1fr) !important;
        grid-template-rows: repeat(2, 1fr) !important;
      }
      #webrtcVideoStrip.gallery-mode #webrtcLocalAvatarInitial,
      #webrtcVideoStrip.gallery-mode [data-role="placeholder"] .rounded-full {
        width: 80px !important;
        height: 80px !important;
        font-size: 32px !important;
      }`;

if (!content.includes(oldMediaMax768)) {
  console.error('Could not find oldMediaMax768');
  process.exit(1);
}
content = content.replace(oldMediaMax768, newMediaMax768);
console.log('Mobile gallery CSS updated.');

// 3. In syncVideoGalleryMode: ensure count classes are applied to strip as well
const oldCountLogic = `        // Calcular cantidad de participantes visibles
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
        }`;

const newCountLogic = `        // Calcular cantidad de participantes visibles
        const remoteCards = strip.querySelectorAll('[id^="webrtcCard_"]');
        const count = 1 + (remoteCards ? remoteCards.length : 0);

        expandedBody.classList.remove('gallery-count-1', 'gallery-count-2', 'gallery-count-3', 'gallery-count-4', 'gallery-count-many');
        strip.classList.remove('gallery-count-1', 'gallery-count-2', 'gallery-count-3', 'gallery-count-4', 'gallery-count-many');
        if (count === 1) {
          expandedBody.classList.add('gallery-count-1');
          strip.classList.add('gallery-count-1');
        } else if (count === 2) {
          expandedBody.classList.add('gallery-count-2');
          strip.classList.add('gallery-count-2');
        } else if (count === 3) {
          expandedBody.classList.add('gallery-count-3');
          strip.classList.add('gallery-count-3');
        } else if (count === 4) {
          expandedBody.classList.add('gallery-count-4');
          strip.classList.add('gallery-count-4');
        } else {
          expandedBody.classList.add('gallery-count-many');
          strip.classList.add('gallery-count-many');
        }`;

if (!content.includes(oldCountLogic)) {
  console.error('Could not find oldCountLogic');
  process.exit(1);
}
content = content.replace(oldCountLogic, newCountLogic);
console.log('Count logic updated.');

// Also in the else branch of syncVideoGalleryMode: remove count classes from strip
const oldElseBranch = `        isGalleryModeActive = false;
        strip.classList.remove('gallery-mode');
        expandedBody.classList.remove('gallery-count-1', 'gallery-count-2', 'gallery-count-3', 'gallery-count-4', 'gallery-count-many');`;

const newElseBranch = `        isGalleryModeActive = false;
        strip.classList.remove('gallery-mode');
        strip.classList.remove('gallery-count-1', 'gallery-count-2', 'gallery-count-3', 'gallery-count-4', 'gallery-count-many');
        expandedBody.classList.remove('gallery-count-1', 'gallery-count-2', 'gallery-count-3', 'gallery-count-4', 'gallery-count-many');`;

if (!content.includes(oldElseBranch)) {
  console.error('Could not find oldElseBranch');
  process.exit(1);
}
content = content.replace(oldElseBranch, newElseBranch);
console.log('Else branch updated.');

// Save files
fs.writeFileSync(studentFile, content, 'utf8');
console.log('ELT LIVE WEB/student.html written successfully.');

const indexFile = path.join(__dirname, '../ELT LIVE WEB/index.html');
const rootStudentFile = path.join(__dirname, '../student.html');

fs.writeFileSync(indexFile, content, 'utf8');
fs.writeFileSync(rootStudentFile, content, 'utf8');
console.log('Synchronized to ELT LIVE WEB/index.html and root student.html successfully.');
