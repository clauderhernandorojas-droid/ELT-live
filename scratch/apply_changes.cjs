const fs = require('fs');

function normalizeNewlines(str) {
  return str.replace(/\r\n/g, '\n');
}

function updateHost(content) {
  let isCrlf = content.includes('\r\n');
  content = normalizeNewlines(content);

  // 1. Update CSS
  const oldCssRegex = /#webrtcVideoStrip\.jitsi-mode\s*\{[\s\S]*?#webrtcVideoStrip\.jitsi-mode #webrtcStripExpandedBody\s*\{[\s\S]*?\}/;
  const newCss = `/* Reducción drástica del dock flotante en Modo Jitsi (185px x 110px por defecto) */
    #webrtcVideoStrip.jitsi-mode {
      max-width: 205px !important;
      width: auto !important;
      padding: 3px !important;
      border-radius: 10px !important;
      transition: max-width 0.2s ease, padding 0.2s ease;
    }
    #webrtcVideoStrip.jitsi-mode #jitsiDockContainer {
      width: 185px !important;
      height: 110px !important;
      max-width: 185px !important;
      max-height: 110px !important;
      border-radius: 8px !important;
      overflow: hidden !important;
      transition: width 0.2s ease, height 0.2s ease, max-width 0.2s ease, max-height 0.2s ease;
    }
    #webrtcVideoStrip.jitsi-mode #webrtcStripExpandedBody {
      overflow: hidden !important;
      padding-right: 0 !important;
      gap: 3px !important;
    }
    /* Expansión temporal para interactuar con botones o login de Jitsi */
    #webrtcVideoStrip.jitsi-mode.jitsi-expanded {
      max-width: 360px !important;
      width: auto !important;
    }
    #webrtcVideoStrip.jitsi-mode.jitsi-expanded #jitsiDockContainer {
      width: 340px !important;
      height: 240px !important;
      max-width: 340px !important;
      max-height: 240px !important;
    }`;

  if (!oldCssRegex.test(content)) {
    throw new Error('Host CSS match failed');
  }
  content = content.replace(oldCssRegex, newCss);

  // 2. Update jitsiDockContainer inline style & classes
  content = content.replace(
    /<div id="jitsiDockContainer" style="width: 260px; height: 150px; max-width: 260px; max-height: 150px; border-radius: 8px; overflow: hidden;" class="w-\[260px\] h-\[150px\] max-w-\[260px\] max-h-\[150px\] rounded-lg overflow-hidden bg-black flex-shrink-0 hidden"><\/div>/,
    '<div id="jitsiDockContainer" style="width: 185px; height: 110px; max-width: 185px; max-height: 110px; border-radius: 8px; overflow: hidden;" class="w-[185px] h-[110px] max-w-[185px] max-h-[110px] rounded-lg overflow-hidden bg-black flex-shrink-0 hidden"></div>'
  );

  // 3. Add btnToggleExpandJitsi next to btnMinimizeVideoStrip in Host
  const hostBtnOld = `<button id="btnMinimizeVideoStrip" type="button" class="absolute top-0.5 right-0.5 w-5 h-5 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-white/15 flex items-center justify-center text-[11px] font-bold leading-none shadow cursor-pointer transition z-10" title="Minimizar miniatura de video">
            —
          </button>`;

  const hostBtnsNew = `<div class="absolute top-0.5 right-0.5 flex items-center gap-1 z-10">
            <button id="btnToggleExpandJitsi" type="button" class="w-5 h-5 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-white/15 flex items-center justify-center text-[11px] font-bold leading-none shadow cursor-pointer transition" title="Expandir / Reducir tamaño de Jitsi">
              ⤢
            </button>
            <button id="btnMinimizeVideoStrip" type="button" class="w-5 h-5 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white border border-white/15 flex items-center justify-center text-[11px] font-bold leading-none shadow cursor-pointer transition" title="Minimizar miniatura de video">
              —
            </button>
          </div>`;

  if (!content.includes(hostBtnOld)) {
    throw new Error('Host button markup match failed');
  }
  content = content.replace(hostBtnOld, hostBtnsNew);

  // 4. In JS, add click listener for btnToggleExpandJitsi
  const hostJsTarget = `    btnMinimizeVideoStrip?.addEventListener('click', (e) => {
      e.stopPropagation();
      setVideoStripMinimized(true);
    });`;

  const hostJsNew = `    const btnToggleExpandJitsi = document.getElementById('btnToggleExpandJitsi');
    btnToggleExpandJitsi?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (webrtcVideoStripEl) {
        const isExp = webrtcVideoStripEl.classList.toggle('jitsi-expanded');
        btnToggleExpandJitsi.textContent = isExp ? '⤡' : '⤢';
        btnToggleExpandJitsi.title = isExp ? 'Restaurar tamaño compacto (185x110)' : 'Expandir tamaño (340x240)';
      }
    });

    btnMinimizeVideoStrip?.addEventListener('click', (e) => {
      e.stopPropagation();
      setVideoStripMinimized(true);
    });`;

  if (!content.includes(hostJsTarget)) {
    throw new Error('Host JS target match failed');
  }
  content = content.replace(hostJsTarget, hostJsNew);

  if (isCrlf) {
    content = content.replace(/\n/g, '\r\n');
  }
  return content;
}

function updateStudent(content) {
  let isCrlf = content.includes('\r\n');
  content = normalizeNewlines(content);

  // 1. Update CSS
  const oldCssRegex = /#webrtcVideoStrip\.jitsi-mode\s*\{[\s\S]*?@media \(max-width: 640px\)\s*\{[\s\S]*?#webrtcVideoStrip\.jitsi-mode #jitsiDockContainer\s*\{[\s\S]*?\}\s*\}/;
  const newCss = `/* Reducción drástica del dock flotante en Modo Jitsi (185px x 110px por defecto) */
    #webrtcVideoStrip.jitsi-mode {
      max-width: 205px !important;
      width: auto !important;
      padding: 3px !important;
      border-radius: 10px !important;
      transition: max-width 0.2s ease, padding 0.2s ease;
    }
    #webrtcVideoStrip.jitsi-mode #jitsiDockContainer {
      width: 185px !important;
      height: 110px !important;
      max-width: 185px !important;
      max-height: 110px !important;
      border-radius: 8px !important;
      overflow: hidden !important;
      transition: width 0.2s ease, height 0.2s ease, max-width 0.2s ease, max-height 0.2s ease;
    }
    #webrtcVideoStrip.jitsi-mode #webrtcStripExpandedBody {
      overflow: hidden !important;
      padding-right: 0 !important;
      gap: 3px !important;
    }
    /* Expansión temporal para interactuar con botones o login de Jitsi */
    #webrtcVideoStrip.jitsi-mode.jitsi-expanded {
      max-width: 360px !important;
      width: auto !important;
    }
    #webrtcVideoStrip.jitsi-mode.jitsi-expanded #jitsiDockContainer {
      width: 340px !important;
      height: 240px !important;
      max-width: 340px !important;
      max-height: 240px !important;
    }
    @media (max-width: 640px) {
      #webrtcVideoStrip.jitsi-mode {
        max-width: 95vw !important;
        width: auto !important;
      }
      #webrtcVideoStrip.jitsi-mode #jitsiDockContainer {
        width: 185px !important;
        height: 110px !important;
        max-width: 185px !important;
        max-height: 110px !important;
        border-radius: 8px !important;
        overflow: hidden !important;
      }
      #webrtcVideoStrip.jitsi-mode.jitsi-expanded #jitsiDockContainer {
        width: min(340px, 92vw) !important;
        height: 220px !important;
        max-width: min(340px, 92vw) !important;
        max-height: 220px !important;
      }
    }`;

  if (!oldCssRegex.test(content)) {
    throw new Error('Student CSS match failed');
  }
  content = content.replace(oldCssRegex, newCss);

  // 2. Update jitsiDockContainer inline style & classes
  content = content.replace(
    /<div id="jitsiDockContainer" style="width: 260px; height: 150px; max-width: 260px; max-height: 150px; border-radius: 8px; overflow: hidden;" class="w-\[260px\] h-\[150px\] max-w-\[260px\] max-h-\[150px\] rounded-lg overflow-hidden bg-black flex-shrink-0 hidden"><\/div>/,
    '<div id="jitsiDockContainer" style="width: 185px; height: 110px; max-width: 185px; max-height: 110px; border-radius: 8px; overflow: hidden;" class="w-[185px] h-[110px] max-w-[185px] max-h-[110px] rounded-lg overflow-hidden bg-black flex-shrink-0 hidden"></div>'
  );

  // 3. Add btnToggleExpandJitsi next to btnMinimizeVideoStrip in Student
  const studentBtnOld = `<!-- Botón Minimizar Cámaras -->
            <button id="btnMinimizeVideoStrip" type="button" onclick="event.stopPropagation(); setVideoStripMinimized(true)" class="self-start -mt-0.5 ml-0.5 w-6 h-6 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center text-xs font-bold transition shrink-0 cursor-pointer" title="Minimizar recuadro de cámaras">
              —
            </button>`;

  const studentBtnsNew = `<!-- Botones Expandir y Minimizar Cámaras -->
            <button id="btnToggleExpandJitsi" type="button" onclick="event.stopPropagation(); toggleJitsiExpandedSize()" class="self-start -mt-0.5 ml-0.5 w-6 h-6 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center text-xs font-bold transition shrink-0 cursor-pointer" title="Expandir / Reducir tamaño de Jitsi">
              ⤢
            </button>
            <button id="btnMinimizeVideoStrip" type="button" onclick="event.stopPropagation(); setVideoStripMinimized(true)" class="self-start -mt-0.5 ml-0.5 w-6 h-6 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center text-xs font-bold transition shrink-0 cursor-pointer" title="Minimizar recuadro de cámaras">
              —
            </button>`;

  if (!content.includes(studentBtnOld)) {
    throw new Error('Student button markup match failed');
  }
  content = content.replace(studentBtnOld, studentBtnsNew);

  // 4. In JS, add window.toggleJitsiExpandedSize function and update drag ignore selector
  const studentJsTarget = `    window.setVideoStripMinimized = function(minimized) {`;
  const studentJsNew = `    window.toggleJitsiExpandedSize = function() {
      const strip = document.getElementById('webrtcVideoStrip');
      const btn = document.getElementById('btnToggleExpandJitsi');
      if (!strip) return;
      const isExp = strip.classList.toggle('jitsi-expanded');
      if (btn) {
        btn.textContent = isExp ? '⤡' : '⤢';
        btn.title = isExp ? 'Restaurar tamaño compacto (185x110)' : 'Expandir tamaño (340x240)';
      }
    };

    window.setVideoStripMinimized = function(minimized) {`;

  if (!content.includes(studentJsTarget)) {
    throw new Error('Student JS target match failed');
  }
  content = content.replace(studentJsTarget, studentJsNew);

  content = content.replace(
    /if \(e\.target\.closest\('button, #webrtcLocalControls, #btnMinimizeVideoStrip, #btnRestoreVideoStrip'\)\) return;/g,
    "if (e.target.closest('button, #webrtcLocalControls, #btnMinimizeVideoStrip, #btnRestoreVideoStrip, #btnToggleExpandJitsi')) return;"
  );

  if (isCrlf) {
    content = content.replace(/\n/g, '\r\n');
  }
  return content;
}

const hostSrc = fs.readFileSync('host.html', 'utf8');
const studentSrc = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');

const updatedHost = updateHost(hostSrc);
const updatedStudent = updateStudent(studentSrc);

fs.writeFileSync('host.html', updatedHost, 'utf8');
fs.writeFileSync('ELT LIVE WEB/student.html', updatedStudent, 'utf8');
fs.writeFileSync('ELT LIVE WEB/index.html', updatedStudent, 'utf8');
fs.writeFileSync('student.html', updatedStudent, 'utf8');

console.log('Successfully updated host.html, ELT LIVE WEB/student.html, ELT LIVE WEB/index.html, student.html');
