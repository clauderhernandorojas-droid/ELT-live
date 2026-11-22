const { app, BrowserWindow, session, ipcMain, desktopCapturer, shell, screen, globalShortcut } = require('electron');
const { execFile, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
// Borde verde externo deshabilitado (no-op limpio; se mantiene la píldora inferior y banner superior)
let floatingShareBarWindow = null;
let floatingParticipantsWindow = null;
let annotateOverlayWindow = null;
let floatingShareState = {
  active: false,
  audioEnabled: false,
  videoEnabled: false,
  sourceName: '',
  participantsVisible: false,
  annotateOpen: false
};

function getOwnElectronMediaSourceIds() {
  return new Set(
    BrowserWindow.getAllWindows()
      .filter(w => w && !w.isDestroyed() && typeof w.getMediaSourceId === 'function')
      .map(w => w.getMediaSourceId())
  );
}

function parseWindowHwndFromSourceId(sourceId) {
  const m = String(sourceId || '').match(/^window:(\d+):/i);
  return m ? m[1] : null;
}

function getWin32WindowRectAsync(hwnd) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32' || !hwnd) return resolve(null);
    const psScript = [
      'Add-Type @"',
      'using System;',
      'using System.Runtime.InteropServices;',
      'public class WinRectHelper {',
      '  [StructLayout(LayoutKind.Sequential)]',
      '  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }',
      '  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);',
      '  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);',
      '}',
      '"@',
      `$h = [IntPtr]::new([int64]${hwnd});`,
      '$r = New-Object WinRectHelper+RECT;',
      'if ([WinRectHelper]::GetWindowRect($h, [ref]$r)) {',
      '  Write-Output ("$($r.Left),$($r.Top),$($r.Right - $r.Left),$($r.Bottom - $r.Top)")',
      '}'
    ].join('\n');
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], { timeout: 2500 }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      const parts = String(stdout).trim().split(',').map(n => parseInt(n, 10));
      if (parts.length !== 4 || parts.some(isNaN) || parts[2] < 40 || parts[3] < 40) return resolve(null);
      const rawRect = { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
      try {
        if (typeof screen.screenToDipRect === 'function') {
          const dip = screen.screenToDipRect(mainWindow || null, rawRect);
          if (dip && dip.width > 40 && dip.height > 40) return resolve(dip);
        }
      } catch (e) {}
      resolve(rawRect);
    });
  });
}

function bringWin32WindowToFront(hwnd, sourceName = '') {
  if (process.platform !== 'win32' || (!hwnd && !sourceName)) return;
  const safeTitle = String(sourceName || '').replace(/'/g, "''").slice(0, 80);
  const psScript = [
    'Add-Type @"',
    'using System;',
    'using System.Text;',
    'using System.Runtime.InteropServices;',
    'public class WinFocusHelper {',
    '  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);',
    '  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);',
    '  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);',
    '  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr hWnd, uint gaFlags);',
    '  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);',
    '  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);',
    '  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);',
    '  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);',
    '  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);',
    '  public static IntPtr FindVisibleByPartialTitle(string needle) {',
    '    if (string.IsNullOrWhiteSpace(needle)) return IntPtr.Zero;',
    '    IntPtr found = IntPtr.Zero;',
    '    EnumWindows((h, l) => {',
    '      if (!IsWindowVisible(h)) return true;',
    '      var sb = new StringBuilder(512);',
    '      GetWindowText(h, sb, sb.Capacity);',
    '      string title = sb.ToString();',
    '      if (!string.IsNullOrEmpty(title) && title.IndexOf(needle, StringComparison.OrdinalIgnoreCase) >= 0) {',
    '        found = h;',
    '        return false;',
    '      }',
    '      return true;',
    '    }, IntPtr.Zero);',
    '    return found;',
    '  }',
    '}',
    '"@',
    `$targetTitle = '${safeTitle}';`,
    `$h = ${hwnd ? `[IntPtr]::new([int64]${hwnd})` : '[IntPtr]::Zero'};`,
    'if ($h -ne [IntPtr]::Zero) {',
    '  $cls = New-Object System.Text.StringBuilder 256;',
    '  [WinFocusHelper]::GetClassName($h, $cls, $cls.Capacity) | Out-Null;',
    '  if ($cls.ToString() -eq "ApplicationFrameWindow" -and $targetTitle.Length -gt 0) {',
    '    $uwp = [WinFocusHelper]::FindVisibleByPartialTitle($targetTitle);',
    '    if ($uwp -ne [IntPtr]::Zero) { $h = $uwp; }',
    '  }',
    '} elseif ($targetTitle.Length -gt 0) {',
    '  $h = [WinFocusHelper]::FindVisibleByPartialTitle($targetTitle);',
    '}',
    'if ($h -ne [IntPtr]::Zero) {',
    '  $root = [WinFocusHelper]::GetAncestor($h, 2);',
    '  if ($root -ne [IntPtr]::Zero) { $h = $root; }',
    '  if ([WinFocusHelper]::IsIconic($h)) { [WinFocusHelper]::ShowWindow($h, 9) | Out-Null; }',
    '  [WinFocusHelper]::SetForegroundWindow($h) | Out-Null;',
    '}'
  ].join('\n');
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psScript], { timeout: 3000 }, () => {});
}

// Borde verde externo limpiado (no-op)
function hideShareBorderWindow() {}
const hideShareBorderOverlay = hideShareBorderWindow;
async function showShareBorderWindow() {}
const showShareBorderOverlay = showShareBorderWindow;

// Capa 2 (Intermedia — Miniaturas de video): esquina superior derecha en nivel Z 'pop-up-menu'
function hideFloatingParticipantsOverlay() {
  if (floatingParticipantsWindow && !floatingParticipantsWindow.isDestroyed()) {
    try { floatingParticipantsWindow.destroy(); } catch (e) {}
  }
  floatingParticipantsWindow = null;
  floatingShareState.participantsVisible = false;
}

function toggleFloatingParticipantsOverlay() {
  if (floatingParticipantsWindow && !floatingParticipantsWindow.isDestroyed()) {
    hideFloatingParticipantsOverlay();
    pushStateToFloatingBar();
    return;
  }
  try {
    const workArea = screen.getPrimaryDisplay().workArea;
    const w = 260;
    const h = 165;
    floatingParticipantsWindow = new BrowserWindow({
      x: Math.round(workArea.x + workArea.width - w - 16),
      y: Math.round(workArea.y + 16),
      width: w,
      height: h,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      hasShadow: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });
    floatingParticipantsWindow.setAlwaysOnTop(true, 'pop-up-menu');
    try { floatingParticipantsWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }); } catch (e) {}
    const participantsHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;user-select:none;}
html,body{width:100%;height:100%;background:transparent;overflow:hidden;}
.shell{width:100%;height:100%;background:rgba(15,23,42,0.92);border:1.5px solid rgba(148,163,184,0.32);border-radius:14px;padding:7px 8px;color:#f1f5f9;display:flex;flex-direction:column;gap:6px;-webkit-app-region:drag;box-shadow:0 10px 26px rgba(0,0,0,0.5);}
.hdr{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0 2px;}
.hdr-title{font-size:10px;font-weight:800;color:#94a3b8;letter-spacing:0.4px;text-transform:uppercase;display:flex;align-items:center;gap:5px;}
.dot{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 6px #22c55e;}
.close{-webkit-app-region:no-drag;border:none;background:transparent;color:#94a3b8;font-size:12px;cursor:pointer;padding:1px 4px;border-radius:6px;}
.close:hover{background:rgba(255,255,255,0.1);color:#fff;}
.grid{flex:1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;overflow-y:auto;align-content:start;}
.grid.single{grid-template-columns:1fr;}
.tile{position:relative;border-radius:10px;overflow:hidden;background:#0f172a;border:1px solid rgba(255,255,255,0.12);aspect-ratio:16/10;display:flex;align-items:center;justify-content:center;}
.tile img{width:100%;height:100%;object-fit:cover;display:block;}
.avatar{width:34px;height:34px;border-radius:999px;background:linear-gradient(135deg,#0e72ed,#6366f1);color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.35);}
.badge{position:absolute;left:4px;right:4px;bottom:4px;display:flex;align-items:center;justify-content:space-between;gap:4px;background:rgba(2,6,23,0.78);padding:2px 6px;border-radius:6px;font-size:9.5px;font-weight:700;color:#e2e8f0;}
.name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.mic-on{color:#4ade80;flex-shrink:0;}
.mic-off{color:#f87171;flex-shrink:0;}
</style></head><body>
<div class="shell">
  <div class="hdr">
    <span class="hdr-title"><span class="dot"></span><span id="hdrCount">Participantes</span></span>
    <button class="close" title="Ocultar miniaturas" onclick="window.electronAPI?.sendFloatingBarAction?.('toggle-participants')">✕</button>
  </div>
  <div id="tilesGrid" class="grid"></div>
</div>
<script>
  const grid = document.getElementById('tilesGrid');
  const hdrCount = document.getElementById('hdrCount');
  function initials(name) {
    const parts = String(name || 'U').trim().split(/\s+/).filter(Boolean);
    return ((parts[0] ? parts[0][0] : 'U') + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }
  function renderParticipants(st) {
    const list = (st && Array.isArray(st.participants) && st.participants.length > 0)
      ? st.participants
      : [{ id: 'self', name: 'Tú', audioEnabled: Boolean(st && st.audioEnabled), videoEnabled: Boolean(st && st.videoEnabled), frameDataUrl: null }];
    hdrCount.textContent = 'En vivo (' + list.length + ')';
    grid.classList.toggle('single', list.length <= 1);
    grid.innerHTML = '';
    for (const p of list.slice(0, 6)) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      if (p.frameDataUrl) {
        const img = document.createElement('img');
        img.src = p.frameDataUrl;
        tile.appendChild(img);
      } else {
        const av = document.createElement('div');
        av.className = 'avatar';
        av.textContent = initials(p.name);
        tile.appendChild(av);
      }
      const badge = document.createElement('div');
      badge.className = 'badge';
      const nm = document.createElement('span');
      nm.className = 'name';
      nm.textContent = p.name || 'Participante';
      const mic = document.createElement('span');
      mic.className = p.audioEnabled ? 'mic-on' : 'mic-off';
      mic.textContent = p.audioEnabled ? '🎤' : '🔇';
      badge.appendChild(nm);
      badge.appendChild(mic);
      tile.appendChild(badge);
      grid.appendChild(tile);
    }
  }
  renderParticipants({});
  window.electronAPI?.onFloatingShareStateUpdate?.(renderParticipants);
</script>
</body></html>`;
    floatingParticipantsWindow.once('ready-to-show', () => {
      if (floatingParticipantsWindow && !floatingParticipantsWindow.isDestroyed()) {
        floatingParticipantsWindow.showInactive();
        floatingParticipantsWindow.setAlwaysOnTop(true, 'pop-up-menu');
        pushStateToFloatingBar();
      }
    });
    floatingParticipantsWindow.on('closed', () => {
      floatingParticipantsWindow = null;
      floatingShareState.participantsVisible = false;
      pushStateToFloatingBar();
    });
    floatingParticipantsWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(participantsHtml));
    floatingShareState.participantsVisible = true;
    pushStateToFloatingBar();
  } catch (err) {
    console.error('Error mostrando floatingParticipantsWindow:', err);
  }
}

// Capa 3 (Superior): Barra Flotante Inferior estilo Zoom con auto-ocultamiento (4s) en nivel Z 'screen-saver'
function pushStateToFloatingBar() {
  const snapshot = { ...floatingShareState };
  if (floatingShareBarWindow && !floatingShareBarWindow.isDestroyed()) {
    try {
      floatingShareBarWindow.webContents.send('floating-share-state-update', snapshot);
    } catch (e) {}
  }
  if (floatingParticipantsWindow && !floatingParticipantsWindow.isDestroyed()) {
    try {
      floatingParticipantsWindow.webContents.send('floating-share-state-update', snapshot);
    } catch (e) {}
  }
  if (annotateOverlayWindow && !annotateOverlayWindow.isDestroyed()) {
    try {
      annotateOverlayWindow.webContents.send('floating-share-state-update', snapshot);
    } catch (e) {}
  }
}

function hideFloatingShareBar() {
  if (floatingShareBarWindow && !floatingShareBarWindow.isDestroyed()) {
    try { floatingShareBarWindow.destroy(); } catch (e) {}
  }
  floatingShareBarWindow = null;
}

function showFloatingShareBar() {
  try {
    hideFloatingShareBar();
    const workArea = screen.getPrimaryDisplay().workArea;
    const barWidth = 540;
    const barHeight = 52;
    const x = Math.round(workArea.x + (workArea.width - barWidth) / 2);
    const y = Math.round(workArea.y + workArea.height - 64);

    floatingShareBarWindow = new BrowserWindow({
      x,
      y,
      width: barWidth,
      height: barHeight,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      hasShadow: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

    floatingShareBarWindow.setAlwaysOnTop(true, 'screen-saver');
    try { floatingShareBarWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }); } catch (e) {}

    const barHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; display: flex; align-items: center; justify-content: center; }
  #barRoot {
    display: flex; align-items: center; justify-content: center; gap: 6px;
    padding: 6px 10px; border-radius: 999px;
    background: rgba(15, 23, 42, 0.94); border: 1.5px solid rgba(34, 197, 94, 0.75);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
    -webkit-app-region: drag;
    transition: all 0.22s ease;
    max-width: 532px;
  }
  #barRoot.collapsed {
    background: rgba(15, 23, 42, 0.62);
    border-color: rgba(34, 197, 94, 0.55);
    padding: 4px 12px;
  }
  .btn {
    -webkit-app-region: no-drag;
    display: inline-flex; align-items: center; gap: 5px;
    border: 1px solid rgba(255,255,255,0.12); background: rgba(30, 41, 59, 0.9);
    color: #e2e8f0; font-size: 11px; font-weight: 700;
    padding: 6px 10px; border-radius: 999px; cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    white-space: nowrap;
  }
  .btn:hover { background: rgba(51, 65, 85, 0.98); color: #fff; }
  .btn.active { background: rgba(16, 185, 129, 0.22); border-color: rgba(52, 211, 153, 0.6); color: #a7f3d0; }
  .btn.muted { background: rgba(239, 68, 68, 0.2); border-color: rgba(248, 113, 113, 0.55); color: #fecaca; }
  .btn.stop { background: #dc2626; border-color: #f87171; color: #fff; }
  .btn.stop:hover { background: #ef4444; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px #22c55e; flex-shrink: 0; }
  .pill-only { display: none; align-items: center; gap: 8px; color: #dcfce7; font-size: 11px; font-weight: 700; }
  .pill-stop {
    -webkit-app-region: no-drag;
    border: none; background: rgba(220, 38, 38, 0.9); color: #fff;
    font-size: 10px; font-weight: 800; padding: 3px 9px; border-radius: 999px; cursor: pointer;
  }
  .pill-stop:hover { background: #ef4444; }
  #barRoot.collapsed .full-only { display: none !important; }
  #barRoot.collapsed .pill-only { display: inline-flex !important; }
</style>
</head>
<body>
  <div id="barRoot">
    <span class="dot full-only"></span>
    <button id="btnMic" class="btn full-only" title="Silenciar / Activar Micrófono">🎤 Mic</button>
    <button id="btnCam" class="btn full-only" title="Encender / Apagar Cámara">📹 Cám</button>
    <button id="btnAnnotate" class="btn full-only" title="Anotar sobre pantalla">✏️ Anotar</button>
    <button id="btnCams" class="btn full-only" title="Mostrar / Ocultar Miniaturas">👥 Cámaras</button>
    <button id="btnStop" class="btn stop full-only" title="Dejar de compartir pantalla">■ Dejar de compartir</button>
    <div class="pill-only">
      <span class="dot"></span>
      <span>Compartiendo</span>
      <button id="btnPillStop" class="pill-stop">Detener</button>
    </div>
  </div>
  <script>
    const root = document.getElementById('barRoot');
    const btnMic = document.getElementById('btnMic');
    const btnCam = document.getElementById('btnCam');
    const btnAnnotate = document.getElementById('btnAnnotate');
    const btnCams = document.getElementById('btnCams');
    const btnStop = document.getElementById('btnStop');
    const btnPillStop = document.getElementById('btnPillStop');
    let hideTimer = null;

    function scheduleCollapse() {
      clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { root.classList.add('collapsed'); }, 4000);
    }
    function expandNow() {
      clearTimeout(hideTimer);
      root.classList.remove('collapsed');
    }

    document.body.addEventListener('mouseenter', expandNow);
    document.body.addEventListener('mouseleave', scheduleCollapse);
    root.addEventListener('mouseenter', expandNow);
    scheduleCollapse();

    btnMic.addEventListener('click', () => window.electronAPI?.sendFloatingBarAction?.('toggle-mic'));
    btnCam.addEventListener('click', () => window.electronAPI?.sendFloatingBarAction?.('toggle-cam'));
    btnAnnotate.addEventListener('click', () => window.electronAPI?.sendFloatingBarAction?.('toggle-annotate'));
    btnCams.addEventListener('click', () => window.electronAPI?.sendFloatingBarAction?.('toggle-participants'));
    btnStop.addEventListener('click', () => window.electronAPI?.sendFloatingBarAction?.('stop-share'));
    btnPillStop.addEventListener('click', (e) => { e.stopPropagation(); window.electronAPI?.sendFloatingBarAction?.('stop-share'); });

    function applyState(st) {
      if (!st) return;
      btnMic.textContent = st.audioEnabled ? '🎤 Mic ON' : '🔇 Mic OFF';
      btnMic.classList.toggle('active', Boolean(st.audioEnabled));
      btnMic.classList.toggle('muted', !st.audioEnabled);

      btnCam.textContent = st.videoEnabled ? '📹 Cám ON' : '🚫 Cám OFF';
      btnCam.classList.toggle('active', Boolean(st.videoEnabled));
      btnCam.classList.toggle('muted', !st.videoEnabled);

      btnCams.classList.toggle('active', Boolean(st.participantsVisible));

      if (st.annotateOpen) {
        btnAnnotate.textContent = '✏️ Cerrar anotación';
        btnAnnotate.style.background = '#d97706';
        btnAnnotate.style.borderColor = '#fbbf24';
        btnAnnotate.style.color = '#ffffff';
      } else {
        btnAnnotate.textContent = '✏️ Anotar';
        btnAnnotate.style.background = '';
        btnAnnotate.style.borderColor = '';
        btnAnnotate.style.color = '';
      }
    }

    window.electronAPI?.onFloatingShareStateUpdate?.(applyState);
  </script>
</body>
</html>`;

    floatingShareBarWindow.once('ready-to-show', () => {
      if (floatingShareBarWindow && !floatingShareBarWindow.isDestroyed()) {
        floatingShareBarWindow.showInactive();
        floatingShareBarWindow.setAlwaysOnTop(true, 'screen-saver');
        pushStateToFloatingBar();
      }
    });
    floatingShareBarWindow.on('closed', () => {
      floatingShareBarWindow = null;
    });
    floatingShareBarWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(barHtml));
  } catch (err) {
    console.error('Error mostrando floatingShareBarWindow en Student:', err);
  }
}

function closeAnnotateOverlay() {
  try { globalShortcut.unregister('Escape'); } catch (e) {}
  if (annotateOverlayWindow && !annotateOverlayWindow.isDestroyed()) {
    try { annotateOverlayWindow.destroy(); } catch (e) {}
  }
  annotateOverlayWindow = null;
  floatingShareState.annotateOpen = false;
  pushStateToFloatingBar();
}
const hideAnnotateOverlayWindow = closeAnnotateOverlay;
const hideAnnotatePaletteWindow = closeAnnotateOverlay;

function toggleAnnotateOverlayWindow() {
  if (annotateOverlayWindow && !annotateOverlayWindow.isDestroyed()) {
    hideAnnotateOverlayWindow();
    return;
  }
  try {
    const targetDisplay = screen.getPrimaryDisplay();
    const bounds = (targetDisplay && targetDisplay.bounds)
      ? targetDisplay.bounds
      : { x: 0, y: 0, width: 1920, height: 1080 };

    annotateOverlayWindow = new BrowserWindow({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      hasShadow: false,
      fullscreenable: false,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });

    annotateOverlayWindow.setAlwaysOnTop(true, 'pop-up-menu');
    try { annotateOverlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }); } catch (e) {}

    const overlayHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  html, body { width: 100vw; height: 100vh; overflow: hidden; background: transparent; position: relative; }
  #saCanvas { position: fixed; inset: 0; width: 100vw; height: 100vh; display: block; cursor: crosshair; z-index: 1; }
  #saToolbar {
    position: fixed; left: 16px; top: 50%; transform: translateY(-50%); z-index: 2147483647; pointer-events: auto;
    width: 78px; max-height: 78vh; overflow-y: auto;
    background: rgba(24, 26, 31, 0.95); border: 1.5px solid rgba(255,255,255,0.16);
    border-radius: 16px; padding: 8px 6px; color: #f8fafc;
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.55);
  }
  .grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; width: 100%; }
  button, select, textarea { -webkit-app-region: no-drag; }
  .tbtn {
    border: 1px solid rgba(255,255,255,0.08); background: rgba(30, 41, 59, 0.72);
    color: #e2e8f0; border-radius: 9px; height: 30px; font-size: 13px; font-weight: 700;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background .14s, border-color .14s, color .14s;
  }
  .tbtn:hover { background: rgba(51, 65, 85, 0.95); color: #fff; }
  .tbtn.active { background: #0e72ed; border-color: #60a5fa; color: #fff; }
  .tbtn.danger { color: #fda4af; }
  .tbtn.danger:hover { background: rgba(225, 29, 72, 0.35); color: #fff; }
  .sep { width: 100%; height: 1px; background: rgba(255,255,255,0.15); margin: 1px 0; }
  .colors { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; justify-items: center; width: 100%; padding: 2px 0; }
  .sw {
    width: 17px; height: 17px; border-radius: 999px; border: 2px solid transparent; cursor: pointer;
    transition: transform .12s, border-color .12s;
  }
  .sw.active { border-color: #fff; transform: scale(1.16); }
  select#saSize {
    width: 100%; background: #1e293b; color: #fff; border: 1px solid #475569;
    border-radius: 7px; font-size: 10px; padding: 3px 2px; cursor: pointer;
  }
  .rich-text-wrap {
    position: fixed; z-index: 100000; display: inline-flex; flex-direction: column;
    background: transparent; border: 1.5px dashed rgba(56, 189, 248, 0.9);
    border-radius: 6px; padding: 2px 6px; min-width: 28px;
  }
  .rich-text-editable {
    background: transparent; border: none; outline: none; display: inline-block;
    min-width: 20px; white-space: pre; font-weight: 700; line-height: 1.25;
    text-shadow: 0 1px 4px rgba(0,0,0,0.85); user-select: text; cursor: text;
  }
  .rich-mini-bar {
    position: absolute; top: -32px; left: 0; display: inline-flex; align-items: center; gap: 3px;
    background: rgba(15, 23, 42, 0.94); border: 1px solid rgba(148,163,184,0.35);
    border-radius: 999px; padding: 2px 6px; box-shadow: 0 6px 16px rgba(0,0,0,0.45);
    white-space: nowrap;
  }
  .rich-mini-btn {
    border: none; background: transparent; color: #e2e8f0; font-size: 12px;
    cursor: pointer; padding: 2px 4px; border-radius: 6px; line-height: 1;
  }
  .rich-mini-btn:hover { background: rgba(255,255,255,0.14); }
  .rich-mini-btn.active { background: rgba(14,114,237,0.55); color: #fff; }
  .rich-resize-handle {
    position: absolute; right: -7px; bottom: -7px; width: 14px; height: 14px;
    border-radius: 999px; background: #38bdf8; border: 2px solid #0f172a;
    cursor: nwse-resize; box-shadow: 0 2px 6px rgba(0,0,0,0.5);
  }
</style>
</head>
<body>
  <canvas id="saCanvas"></canvas>
  <div id="saToolbar">
    <button id="btnTopExitEsc" title="Salir de anotación (Esc)" style="width:100%;border:1px solid #f87171;background:#dc2626;color:#fff;border-radius:9px;padding:6px 4px;font-size:10px;font-weight:800;cursor:pointer;line-height:1.15;box-shadow:0 4px 12px rgba(220,38,38,0.45);">✕ Salir<br>(Esc)</button>
    <div class="sep"></div>
    <button class="tbtn" data-tool="mouse" style="width:100%;font-size:10px;height:28px;" title="Modo Ratón (pasar clics a Edge/PDF)">🖱️ Ratón</button>
    <div class="grid2">
      <button class="tbtn" data-tool="select" title="Seleccionar / Mover">↖</button>
      <button class="tbtn" data-tool="move" title="Mover objeto">✥</button>
      <button class="tbtn active" data-tool="pen" title="Lápiz">✏️</button>
      <button class="tbtn" data-tool="highlighter" title="Resaltador">🖍️</button>
      <button class="tbtn" data-tool="text" title="Texto (doble clic para editar)">A</button>
      <button class="tbtn" data-tool="rect" title="Rectángulo">▭</button>
      <button class="tbtn" data-tool="ellipse" title="Círculo / Elipse">◯</button>
      <button class="tbtn" data-tool="arrow" title="Flecha">➜</button>
      <button class="tbtn" data-tool="eraser" style="grid-column:span 2;" title="Borrador">⌫</button>
    </div>
    <div class="sep"></div>
    <div class="colors">
      <button class="sw active" data-color="#ef4444" style="background:#ef4444" title="Rojo"></button>
      <button class="sw" data-color="#0e72ed" style="background:#0e72ed" title="Azul"></button>
      <button class="sw" data-color="#10b981" style="background:#10b981" title="Verde"></button>
      <button class="sw" data-color="#f59e0b" style="background:#f59e0b" title="Amarillo"></button>
      <button class="sw" data-color="#ffffff" style="background:#ffffff" title="Blanco"></button>
      <button class="sw" data-color="#000000" style="background:#000000;border-color:#64748b" title="Negro"></button>
    </div>
    <div class="sep"></div>
    <select id="saSize" title="Grosor / Tamaño">
      <option value="3">Fino</option>
      <option value="5" selected>Medio</option>
      <option value="9">Grueso</option>
    </select>
    <div class="grid2">
      <button class="tbtn" id="btnUndo" title="Deshacer">↩</button>
      <button class="tbtn" id="btnRedo" title="Rehacer">↪</button>
      <button class="tbtn danger" id="btnClear" title="Limpiar todo">🗑</button>
      <button class="tbtn" id="btnClose" title="Cerrar anotación (devolver clics)">✕</button>
    </div>
  </div>
<script>
  const canvas = document.getElementById('saCanvas');
  const ctx = canvas.getContext('2d');
  let items = [];
  let history = [];
  let redoStack = [];
  let tool = 'pen';
  let color = '#ef4444';
  let size = 5;
  let isDrawing = false;
  let isDragging = false;
  let isErasing = false;
  let activeItem = null;
  let dragStart = null;
  let dragOrig = null;
  let activeEditor = null;
  let lastLocalMutationAt = 0;
  const IS_HOST_OVERLAY = false;
  const OVERLAY_OWNER_ID = IS_HOST_OVERLAY ? 'host' : ('student_' + Math.random().toString(36).slice(2, 8));

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    renderAll();
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function sendSync(action, payload) {
    lastLocalMutationAt = Date.now();
    try {
      window.electronAPI?.sendFloatingBarAction?.(Object.assign({ type: 'sa-overlay-sync', action }, payload || {}));
    } catch (e) {}
  }

  function pushHist() {
    history.push(JSON.stringify(items));
    if (history.length > 40) history.shift();
    redoStack = [];
  }

  function toNorm(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const rw = Math.max(1, rect.width || canvas.width || 1);
    const rh = Math.max(1, rect.height || canvas.height || 1);
    return {
      nx: Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / rw)) * 10000) / 10000,
      ny: Math.round(Math.max(0, Math.min(1, (clientY - rect.top) / rh)) * 10000) / 10000
    };
  }

  function getTextBoundsPx(it) {
    const fsPx = Math.max(14, Math.round((it.fontSizeNorm || 0.038) * canvas.height));
    ctx.save();
    ctx.font = '700 ' + fsPx + 'px system-ui, -apple-system, sans-serif';
    const lines = String(it.text || 'Texto').split(String.fromCharCode(10));
    let maxW = 60;
    for (const ln of lines) {
      const m = ctx.measureText(ln).width;
      if (m > maxW) maxW = m;
    }
    ctx.restore();
    const x = (it.nx || 0) * canvas.width;
    const y = (it.ny || 0) * canvas.height;
    const h = Math.max(fsPx * 1.3, lines.length * fsPx * 1.28);
    return { x: x - 6, y: y - 4, w: maxW + 16, h: h + 10, fsPx };
  }

  function hitTestItem(nx, ny) {
    const px = nx * canvas.width;
    const py = ny * canvas.height;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.type === 'text') {
        const b = getTextBoundsPx(it);
        if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return it;
      } else if (it.type === 'shape') {
        const x1 = Math.min(it.nx, it.nx + (it.nw || 0)) * canvas.width - 10;
        const x2 = Math.max(it.nx, it.nx + (it.nw || 0)) * canvas.width + 10;
        const y1 = Math.min(it.ny, it.ny + (it.nh || 0)) * canvas.height - 10;
        const y2 = Math.max(it.ny, it.ny + (it.nh || 0)) * canvas.height + 10;
        if (px >= x1 && px <= x2 && py >= y1 && py <= y2) return it;
      } else if (it.type === 'stroke' && Array.isArray(it.points)) {
        for (const p of it.points) {
          if (Math.hypot(p.nx * canvas.width - px, p.ny * canvas.height - py) <= 14) return it;
        }
      }
    }
    return null;
  }

  function renderAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;
    for (const it of items) {
      if (it.type === 'stroke' && Array.isArray(it.points) && it.points.length > 0) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = it.color || '#ef4444';
        ctx.globalAlpha = it.isHighlighter ? 0.36 : 1;
        ctx.lineWidth = Math.max(2, (it.sizeNorm || 0.004) * w);
        ctx.beginPath();
        ctx.moveTo(it.points[0].nx * w, it.points[0].ny * h);
        for (let i = 1; i < it.points.length; i++) {
          ctx.lineTo(it.points[i].nx * w, it.points[i].ny * h);
        }
        ctx.stroke();
        ctx.restore();
      } else if (it.type === 'shape') {
        const x = it.nx * w;
        const y = it.ny * h;
        const sw = (it.nw || 0) * w;
        const sh = (it.nh || 0) * h;
        ctx.save();
        ctx.strokeStyle = it.color || '#ef4444';
        ctx.fillStyle = it.color || '#ef4444';
        ctx.lineWidth = Math.max(2, (it.sizeNorm || 0.004) * w);
        if (it.shape === 'rect') {
          ctx.strokeRect(x, y, sw, sh);
        } else if (it.shape === 'ellipse') {
          ctx.beginPath();
          ctx.ellipse(x + sw / 2, y + sh / 2, Math.abs(sw / 2), Math.abs(sh / 2), 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (it.shape === 'arrow') {
          const x2 = x + sw;
          const y2 = y + sh;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          const ang = Math.atan2(y2 - y, x2 - x);
          const head = Math.max(12, ctx.lineWidth * 3.2);
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - head * Math.cos(ang - Math.PI / 6), y2 - head * Math.sin(ang - Math.PI / 6));
          ctx.lineTo(x2 - head * Math.cos(ang + Math.PI / 6), y2 - head * Math.sin(ang + Math.PI / 6));
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      } else if (it.type === 'text') {
        if (activeEditor && activeEditor.itemId === it.id) continue;
        const fsPx = Math.max(14, Math.round((it.fontSizeNorm || 0.038) * h));
        ctx.save();
        ctx.font = '700 ' + fsPx + 'px system-ui, -apple-system, sans-serif';
        ctx.textBaseline = 'top';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = it.color || '#ffffff';
        const lines = String(it.text || '').split(String.fromCharCode(10));
        const tx = (it.nx || 0) * w;
        const ty = (it.ny || 0) * h;
        lines.forEach((ln, idx) => {
          ctx.fillText(ln, tx, ty + idx * fsPx * 1.25);
        });
        if (it.reaction || it.locked) {
          ctx.font = '700 13px system-ui, -apple-system, sans-serif';
          const tag = (it.locked ? '🔒 ' : '') + (it.reaction || '');
          ctx.fillText(tag.trim(), tx, Math.max(2, ty - 18));
        }
        ctx.restore();
      }
    }
  }

  function openInlineTextEditor(item, isNew) {
    if (activeEditor && typeof activeEditor.commit === 'function') {
      activeEditor.commit();
    }
    const wrap = document.createElement('div');
    wrap.className = 'rich-text-wrap';
    wrap.style.left = Math.round((item.nx || 0) * canvas.width) + 'px';
    wrap.style.top = Math.round((item.ny || 0) * canvas.height) + 'px';

    const miniBar = document.createElement('div');
    miniBar.className = 'rich-mini-bar';

    const canToggleLock = IS_HOST_OVERLAY || !item.ownerId || item.ownerId === OVERLAY_OWNER_ID;
    const lockBtn = document.createElement('button');
    lockBtn.type = 'button';
    lockBtn.className = 'rich-mini-btn' + (item.locked ? ' active' : '');
    lockBtn.title = canToggleLock
      ? (item.locked ? 'Desbloquear texto' : 'Bloquear texto')
      : 'Solo el profesor o el autor puede desbloquear';
    lockBtn.textContent = item.locked ? '🔒' : '🔓';
    lockBtn.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (!canToggleLock) return;
      item.locked = !item.locked;
      lockBtn.textContent = item.locked ? '🔒' : '🔓';
      lockBtn.title = item.locked ? 'Desbloquear texto' : 'Bloquear texto';
      lockBtn.classList.toggle('active', Boolean(item.locked));
      ed.contentEditable = item.locked ? 'false' : 'true';
      ed.style.cursor = item.locked ? 'default' : 'text';
      delBtn.style.display = item.locked ? 'none' : '';
      handle.style.display = item.locked ? 'none' : '';
      sendSync('upsert', { item });
      sendSync('full_sync', { items });
      if (!item.locked) {
        setTimeout(() => { try { ed.focus(); } catch (e) {} }, 10);
      }
    });
    miniBar.appendChild(lockBtn);

    ['👍', '❤️', '✅', '❓'].forEach((emoji) => {
      const rb = document.createElement('button');
      rb.type = 'button';
      rb.className = 'rich-mini-btn' + (item.reaction === emoji ? ' active' : '');
      rb.title = 'Reacción ' + emoji;
      rb.textContent = emoji;
      rb.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        item.reaction = item.reaction === emoji ? '' : emoji;
        miniBar.querySelectorAll('[data-react]').forEach(b => b.classList.toggle('active', b.dataset.react === item.reaction));
        sendSync('upsert', { item });
      });
      rb.dataset.react = emoji;
      miniBar.appendChild(rb);
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'rich-mini-btn';
    delBtn.title = 'Eliminar texto';
    delBtn.textContent = '🗑️';
    if (item.locked) delBtn.style.display = 'none';
    delBtn.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (item.locked) return;
      committed = true;
      wrap.remove();
      if (activeEditor && activeEditor.el === wrap) activeEditor = null;
      items = items.filter(x => x.id !== item.id);
      renderAll();
      sendSync('delete', { id: item.id });
    });
    miniBar.appendChild(delBtn);
    wrap.appendChild(miniBar);

    const ed = document.createElement('div');
    ed.className = 'rich-text-editable';
    ed.contentEditable = item.locked ? 'false' : 'true';
    const fsPx = Math.max(14, Math.round((item.fontSizeNorm || 0.038) * canvas.height));
    ed.style.fontSize = fsPx + 'px';
    ed.style.color = item.color || '#ffffff';
    ed.innerText = item.text || '';
    wrap.appendChild(ed);

    const handle = document.createElement('div');
    handle.className = 'rich-resize-handle';
    handle.title = 'Arrastrar para cambiar tamaño de fuente';
    if (item.locked) handle.style.display = 'none';
    let resizing = false;
    handle.addEventListener('mousedown', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (item.locked) return;
      resizing = true;
      const startX = ev.clientX;
      const startY = ev.clientY;
      const origNorm = item.fontSizeNorm || 0.038;
      const onMove = (me) => {
        if (!resizing) return;
        const delta = ((me.clientX - startX) + (me.clientY - startY)) / Math.max(1, canvas.height);
        const nextNorm = Math.max(0.018, Math.min(0.18, origNorm + delta * 0.45));
        item.fontSizeNorm = Math.round(nextNorm * 10000) / 10000;
        ed.style.fontSize = Math.max(14, Math.round(item.fontSizeNorm * canvas.height)) + 'px';
      };
      const onUp = () => {
        resizing = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp, true);
        sendSync('upsert', { item });
        ed.focus();
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp, true);
    });
    wrap.appendChild(handle);

    document.body.appendChild(wrap);

    let isCommitting = false;
    let committed = false;
    const commit = () => {
      if (isCommitting || committed || resizing) return;
      isCommitting = true;
      committed = true;
      // Leer texto ANTES de desmontar el editor
      const rawText = (ed.innerText || ed.textContent || '')
        .split(String.fromCharCode(160)).join(' ')
        .split(String.fromCharCode(13)).join('')
        .trim();
      if (activeEditor && activeEditor.el === wrap) activeEditor = null;
      try { wrap.remove(); } catch (e) {}
      if (!rawText && isNew) {
        items = items.filter(x => x.id !== item.id);
        renderAll();
        sendSync('delete', { id: item.id });
        sendSync('full_sync', { items });
        return;
      }
      if (rawText) {
        item.text = rawText;
      }
      const existingIdx = items.findIndex(x => x.id === item.id);
      if (existingIdx >= 0) {
        items[existingIdx] = item;
      } else {
        items.push(item);
      }
      lastLocalMutationAt = Date.now();
      renderAll();
      sendSync('upsert', { item });
      sendSync('full_sync', { items });
    };

    activeEditor = { el: wrap, itemId: item.id, commit };
    renderAll();

    ed.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault();
        commit();
      } else if (ev.key === 'Escape') {
        ev.preventDefault();
        commit();
      }
    });
    ed.addEventListener('blur', () => {
      setTimeout(() => {
        if (!resizing && (!document.activeElement || !wrap.contains(document.activeElement))) {
          commit();
        }
      }, 20);
    });
    setTimeout(() => {
      ed.focus();
      try {
        const range = document.createRange();
        range.selectNodeContents(ed);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) {}
    }, 15);
  }

  const toolbarEl = document.getElementById('saToolbar');
  function setTool(t) {
    tool = t;
    document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
    if (t === 'mouse') {
      canvas.style.cursor = 'default';
      canvas.style.pointerEvents = 'none';
      window.electronAPI?.sendFloatingBarAction?.('annotate:passthrough:on');
    } else {
      canvas.style.pointerEvents = 'auto';
      canvas.style.cursor = (t === 'select' || t === 'move') ? 'default' : 'crosshair';
      window.electronAPI?.sendFloatingBarAction?.('annotate:passthrough:off');
    }
  }
  toolbarEl.addEventListener('mouseenter', () => {
    if (tool === 'mouse') {
      window.electronAPI?.sendFloatingBarAction?.('annotate:passthrough:off');
    }
  });
  toolbarEl.addEventListener('mouseleave', () => {
    if (tool === 'mouse') {
      window.electronAPI?.sendFloatingBarAction?.('annotate:passthrough:on');
    }
  });

  document.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => setTool(b.dataset.tool)));
  document.querySelectorAll('[data-color]').forEach(s => {
    s.addEventListener('click', () => {
      color = s.dataset.color;
      document.querySelectorAll('[data-color]').forEach(x => x.classList.remove('active'));
      s.classList.add('active');
    });
  });
  document.getElementById('saSize').addEventListener('change', (e) => { size = parseInt(e.target.value, 10) || 5; });
  document.getElementById('btnUndo').addEventListener('click', () => {
    if (!history.length) return;
    redoStack.push(JSON.stringify(items));
    items = JSON.parse(history.pop());
    renderAll();
    sendSync('full_sync', { items });
  });
  document.getElementById('btnRedo').addEventListener('click', () => {
    if (!redoStack.length) return;
    history.push(JSON.stringify(items));
    items = JSON.parse(redoStack.pop());
    renderAll();
    sendSync('full_sync', { items });
  });
  document.getElementById('btnClear').addEventListener('click', () => {
    if (!items.length) return;
    pushHist();
    items = [];
    renderAll();
    sendSync('clear', {});
  });
  const closeOverlayNow = () => window.electronAPI?.sendFloatingBarAction?.('annotate:close');
  document.getElementById('btnClose').addEventListener('click', closeOverlayNow);
  document.getElementById('btnTopExitEsc').addEventListener('click', closeOverlayNow);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !activeEditor) {
      e.preventDefault();
      closeOverlayNow();
    }
  });

  // Double-click in capture phase on #saCanvas using ctx.measureText + 12px padding
  canvas.addEventListener('dblclick', (e) => {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (canvas.width / Math.max(1, rect.width));
    const py = (e.clientY - rect.top) * (canvas.height / Math.max(1, rect.height));
    let hitText = null;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      if (it.type !== 'text') continue;
      const b = getTextBoundsPx(it);
      if (px >= b.x - 12 && px <= b.x + b.w + 12 && py >= b.y - 12 && py <= b.y + b.h + 12) {
        hitText = it;
        break;
      }
    }
    if (hitText && !hitText.locked) {
      e.stopPropagation();
      e.preventDefault();
      pushHist();
      openInlineTextEditor(hitText, false);
    }
  }, true);

  function commitActiveTextEditor() {
    if (activeEditor && typeof activeEditor.commit === 'function') {
      activeEditor.commit();
      return true;
    }
    return false;
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (activeEditor && e.target === canvas) {
      e.preventDefault();
      e.stopPropagation();
      commitActiveTextEditor();
    }
  }, true);

  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (commitActiveTextEditor()) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const pt = toNorm(e.clientX, e.clientY);
    if (tool === 'select' || tool === 'move') {
      const hit = hitTestItem(pt.nx, pt.ny);
      if (hit) {
        if (hit.locked) {
          if (hit.type === 'text') {
            openInlineTextEditor(hit, false);
          }
          return;
        }
        pushHist();
        isDragging = true;
        activeItem = hit;
        dragStart = pt;
        dragOrig = hit.type === 'stroke'
          ? { points: hit.points.map(p => ({ nx: p.nx, ny: p.ny })) }
          : { nx: hit.nx || 0, ny: hit.ny || 0 };
      }
      return;
    }
    if (tool === 'eraser') {
      pushHist();
      isErasing = true;
      const hit = hitTestItem(pt.nx, pt.ny);
      if (hit && !hit.locked) {
        items = items.filter(x => x.id !== hit.id);
        renderAll();
        sendSync('delete', { id: hit.id });
      }
      return;
    }
    if (tool === 'pen' || tool === 'highlighter') {
      pushHist();
      isDrawing = true;
      const pxSize = tool === 'highlighter' ? Math.max(16, size * 3.2) : size;
      activeItem = {
        id: 'sa_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        type: 'stroke',
        color,
        isHighlighter: tool === 'highlighter',
        sizeNorm: Math.round((pxSize / Math.max(1, canvas.width)) * 10000) / 10000,
        points: [pt]
      };
      items.push(activeItem);
      renderAll();
      return;
    }
    if (tool === 'rect' || tool === 'ellipse' || tool === 'arrow') {
      pushHist();
      isDrawing = true;
      activeItem = {
        id: 'sa_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        type: 'shape',
        shape: tool,
        color,
        sizeNorm: Math.round((size / Math.max(1, canvas.width)) * 10000) / 10000,
        nx: pt.nx, ny: pt.ny, nw: 0.001, nh: 0.001
      };
      items.push(activeItem);
      renderAll();
      return;
    }
    if (tool === 'text') {
      const existing = hitTestItem(pt.nx, pt.ny);
      if (existing && existing.type === 'text') {
        if (!existing.locked) {
          pushHist();
          openInlineTextEditor(existing, false);
        }
        return;
      }
      pushHist();
      const fsNorm = size <= 3 ? 0.032 : (size <= 5 ? 0.042 : 0.056);
      const newText = {
        id: 'sa_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        type: 'text',
        ownerId: OVERLAY_OWNER_ID,
        nx: pt.nx,
        ny: Math.max(0, pt.ny - fsNorm / 2),
        fontSizeNorm: fsNorm,
        color,
        text: ''
      };
      items.push(newText);
      renderAll();
      openInlineTextEditor(newText, true);
    }
  });

  function finishDrag() {
    if (!isDrawing && !isDragging && !isErasing) return;
    if (isDrawing && activeItem) sendSync('upsert', { item: activeItem });
    isDrawing = false;
    isDragging = false;
    isErasing = false;
    activeItem = null;
    dragStart = null;
    dragOrig = null;
  }

  window.addEventListener('mousemove', (e) => {
    if (!isDrawing && !isDragging && !isErasing) return;
    if (typeof e.buttons === 'number' && e.buttons === 0) { finishDrag(); return; }
    const pt = toNorm(e.clientX, e.clientY);
    if (isDrawing && activeItem) {
      if (activeItem.type === 'stroke') activeItem.points.push(pt);
      else if (activeItem.type === 'shape') {
        activeItem.nw = Math.round((pt.nx - activeItem.nx) * 10000) / 10000;
        activeItem.nh = Math.round((pt.ny - activeItem.ny) * 10000) / 10000;
      }
      renderAll();
      sendSync('upsert', { item: activeItem });
    } else if (isErasing) {
      const hit = hitTestItem(pt.nx, pt.ny);
      if (hit && !hit.locked) {
        items = items.filter(x => x.id !== hit.id);
        renderAll();
        sendSync('delete', { id: hit.id });
      }
    } else if (isDragging && activeItem && dragStart && dragOrig) {
      const dnx = pt.nx - dragStart.nx;
      const dny = pt.ny - dragStart.ny;
      if (activeItem.type === 'stroke' && Array.isArray(dragOrig.points)) {
        activeItem.points = dragOrig.points.map(p => ({ nx: Math.max(0, Math.min(1, p.nx + dnx)), ny: Math.max(0, Math.min(1, p.ny + dny)) }));
      } else {
        activeItem.nx = Math.max(0, Math.min(0.98, dragOrig.nx + dnx));
        activeItem.ny = Math.max(0, Math.min(0.98, dragOrig.ny + dny));
      }
      renderAll();
      sendSync('upsert', { item: activeItem });
    }
  });

  window.addEventListener('mouseup', finishDrag, true);
  window.addEventListener('pointerup', finishDrag, true);
  window.addEventListener('blur', finishDrag);
  document.addEventListener('mouseleave', finishDrag);

  window.electronAPI?.onFloatingShareStateUpdate?.((st) => {
    if (!st || !Array.isArray(st.saItems)) return;
    if (activeEditor || isDrawing || isDragging || isErasing) return;
    if (Date.now() - lastLocalMutationAt < 1500) return;
    items = st.saItems;
    renderAll();
  });
</script>
</body>
</html>`;

    annotateOverlayWindow.once('ready-to-show', () => {
      if (annotateOverlayWindow && !annotateOverlayWindow.isDestroyed()) {
        annotateOverlayWindow.show();
        annotateOverlayWindow.setAlwaysOnTop(true, 'pop-up-menu');
        if (floatingShareBarWindow && !floatingShareBarWindow.isDestroyed()) {
          floatingShareBarWindow.setAlwaysOnTop(true, 'screen-saver');
          floatingShareBarWindow.moveTop();
        }
        floatingShareState.annotateOpen = true;
        try {
          globalShortcut.unregister('Escape');
          globalShortcut.register('Escape', () => closeAnnotateOverlay());
        } catch (e) {}
        pushStateToFloatingBar();
      }
    });
    annotateOverlayWindow.on('closed', () => {
      try { globalShortcut.unregister('Escape'); } catch (e) {}
      annotateOverlayWindow = null;
      floatingShareState.annotateOpen = false;
      pushStateToFloatingBar();
    });
    const tmpOverlayPath = path.join(app.getPath('temp'), 'elt-annotate-overlay.html');
    fs.writeFileSync(tmpOverlayPath, overlayHtml, 'utf8');
    annotateOverlayWindow.loadFile(tmpOverlayPath);
  } catch (err) {
    console.error('Error mostrando annotateOverlayWindow:', err);
  }
}
const toggleAnnotatePaletteWindow = toggleAnnotateOverlayWindow;

async function enterFloatingShareMode(opts = {}) {
  floatingShareState.active = true;
  if (typeof opts.audioEnabled === 'boolean') floatingShareState.audioEnabled = opts.audioEnabled;
  if (typeof opts.videoEnabled === 'boolean') floatingShareState.videoEnabled = opts.videoEnabled;
  if (opts.sourceName) floatingShareState.sourceName = String(opts.sourceName);

  // 1. Ocultar completamente la ventana principal de ELT Live (Modo Zoom real)
  if (mainWindow && !mainWindow.isDestroyed()) {
    try { mainWindow.hide(); } catch (e) {}
  }

  await showShareBorderWindow(opts);
  showFloatingShareBar();
  if (!floatingParticipantsWindow || floatingParticipantsWindow.isDestroyed()) {
    toggleFloatingParticipantsOverlay();
  }
  pushStateToFloatingBar();

  // 2. Tras 120ms, traer al frente la ventana externa compartida (incluye soporte UWP ApplicationFrameWindow)
  if (opts && !opts.isScreen && opts.sourceId) {
    const hwnd = parseWindowHwndFromSourceId(opts.sourceId);
    const titleHint = opts.sourceName || '';
    if (hwnd || titleHint) {
      setTimeout(() => {
        bringWin32WindowToFront(hwnd, titleHint);
      }, 120);
    }
  }
  return true;
}

function exitFloatingShareMode() {
  floatingShareState.active = false;
  hideShareBorderWindow();
  hideFloatingShareBar();
  hideFloatingParticipantsOverlay();
  closeAnnotateOverlay();
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.show();
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } catch (e) {}
  }
  return true;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'ELT Live — Aula Virtual (Estudiante)',
    backgroundColor: '#090d16',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  });

  // Cargar student.html
  mainWindow.loadFile(path.join(__dirname, 'student.html'));

  // Manejador de captura de pantalla si el estudiante comparte pantalla (excluyendo únicamente ventanas propias de Electron)
  const handleStudentDisplayMediaRequest = async (request, callback) => {
    try {
      const allSources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
      const ownSourceIds = getOwnElectronMediaSourceIds();
      const filteredSources = allSources.filter(source => !ownSourceIds.has(source.id));
      const sources = filteredSources.length > 0 ? filteredSources : allSources;
      const withAudio = (typeof global.__selectedDesktopWithAudio === 'boolean')
        ? global.__selectedDesktopWithAudio
        : Boolean(request.audioRequested);

      let chosenSource = null;
      if (global.__selectedDesktopSourceId) {
        chosenSource = allSources.find(s => s.id === global.__selectedDesktopSourceId) || null;
      }
      if (!chosenSource) {
        chosenSource = sources.find(s => String(s.id || '').startsWith('screen:')) || sources[0];
      }

      if (chosenSource) {
        const response = { video: chosenSource };
        if (withAudio) response.audio = 'loopback';
        callback(response);
      } else {
        callback({});
      }
    } catch (err) {
      console.error('Error al capturar pantalla en Electron (Student):', err);
      callback({});
    }
  };

  mainWindow.webContents.session.setDisplayMediaRequestHandler(handleStudentDisplayMediaRequest);

  // Manejo de eventos de ventana para IPC
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:stateChange', 'maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:stateChange', 'restored');
  });

  mainWindow.on('closed', () => {
    hideShareBorderWindow();
    hideFloatingShareBar();
    hideFloatingParticipantsOverlay();
    closeAnnotateOverlay();
    mainWindow = null;
  });
}

// Configurar permisos automáticos de medios (cámara, micrófono, pantalla, notificaciones, audio)
function configureMediaPermissions() {
  const ses = session.defaultSession;

  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const allowedPermissions = [
      'media',
      'mediaKeySystem',
      'geolocation',
      'notifications',
      'fullscreen',
      'pointerLock',
      'display-capture'
    ];

    if (allowedPermissions.includes(permission)) {
      return callback(true);
    }
    callback(true);
  });

  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    return true;
  });

  ses.setDevicePermissionHandler((details) => {
    return true;
  });

  ses.setDisplayMediaRequestHandler(async (request, callback) => {
    try {
      const allSources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
      const ownSourceIds = getOwnElectronMediaSourceIds();
      const filteredSources = allSources.filter(source => !ownSourceIds.has(source.id));
      const sources = filteredSources.length > 0 ? filteredSources : allSources;
      const withAudio = (typeof global.__selectedDesktopWithAudio === 'boolean')
        ? global.__selectedDesktopWithAudio
        : Boolean(request.audioRequested);

      let chosenSource = null;
      if (global.__selectedDesktopSourceId) {
        chosenSource = allSources.find(s => s.id === global.__selectedDesktopSourceId) || null;
      }
      if (!chosenSource) {
        chosenSource = sources.find(s => String(s.id || '').startsWith('screen:')) || sources[0];
      }

      if (chosenSource) {
        const response = { video: chosenSource };
        if (withAudio) response.audio = 'loopback';
        callback(response);
      } else {
        callback({});
      }
    } catch (err) {
      console.error('Error al obtener fuentes de pantalla en Student:', err);
      callback({});
    }
  });
}

// Handlers IPC para control de ventana
function setupIPCHandlers() {
  ipcMain.handle('window:minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      return mainWindow.isMaximized();
    }
    return false;
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isMaximized() : false;
  });

  ipcMain.handle('get-desktop-sources', async () => {
    try {
      const allSources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 340, height: 192 },
        fetchWindowIcons: true
      });
      const ownSourceIds = new Set(
        BrowserWindow.getAllWindows()
          .filter(w => w && !w.isDestroyed() && typeof w.getMediaSourceId === 'function')
          .map(w => w.getMediaSourceId())
      );
      const sources = allSources.filter(source => !ownSourceIds.has(source.id));
      return sources.map(source => {
        const thumbUrl = source.thumbnail ? source.thumbnail.toDataURL() : '';
        const iconUrl = (source.appIcon && typeof source.appIcon.toDataURL === 'function' && (!source.appIcon.isEmpty || !source.appIcon.isEmpty()))
          ? source.appIcon.toDataURL()
          : null;
        return {
          id: source.id,
          name: source.name,
          display_id: source.display_id || '',
          isScreen: String(source.id || '').startsWith('screen:'),
          thumbnail: thumbUrl,
          thumbnailDataUrl: thumbUrl,
          appIconDataUrl: iconUrl
        };
      });
    } catch (err) {
      console.error('Error obteniendo fuentes en main-student.js:', err);
      return [];
    }
  });

  ipcMain.handle('set-selected-desktop-source', (event, sourceId, withAudio) => {
    if (sourceId && typeof sourceId === 'object') {
      global.__selectedDesktopSourceId = sourceId.sourceId || sourceId.id || null;
      global.__selectedDesktopWithAudio = typeof sourceId.withAudio === 'boolean' ? sourceId.withAudio : null;
    } else {
      global.__selectedDesktopSourceId = sourceId || null;
      global.__selectedDesktopWithAudio = typeof withAudio === 'boolean' ? withAudio : null;
    }
    return true;
  });

  ipcMain.handle('show-share-border', async (_event, opts) => {
    await showShareBorderWindow(opts || {});
    return true;
  });

  ipcMain.handle('hide-share-border', () => {
    if (floatingShareState.active) {
      exitFloatingShareMode();
    } else {
      hideShareBorderWindow();
    }
    return true;
  });

  ipcMain.handle('enter-floating-share-mode', async (_event, opts) => {
    return await enterFloatingShareMode(opts || {});
  });

  ipcMain.handle('exit-floating-share-mode', () => {
    return exitFloatingShareMode();
  });

  ipcMain.handle('update-floating-share-state', (_event, partial) => {
    if (partial && typeof partial === 'object') {
      Object.assign(floatingShareState, partial);
      pushStateToFloatingBar();
    }
    return true;
  });

  ipcMain.handle('floating-bar-action', (_event, action) => {
    if (action === 'toggle-participants') {
      toggleFloatingParticipantsOverlay();
      return true;
    }
    if (action === 'restore-main') {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
      return true;
    }
    if (action === 'toggle-annotate' || action === 'annotate') {
      toggleAnnotateOverlayWindow();
      return true;
    }
    if (action && typeof action === 'object' && action.type === 'sa-overlay-sync') {
      if (!Array.isArray(floatingShareState.saItems)) floatingShareState.saItems = [];
      if (action.action === 'upsert' && action.item && action.item.id) {
        const idx = floatingShareState.saItems.findIndex(x => x.id === action.item.id);
        if (idx >= 0) floatingShareState.saItems[idx] = action.item;
        else floatingShareState.saItems.push(action.item);
      } else if (action.action === 'delete' && action.id) {
        floatingShareState.saItems = floatingShareState.saItems.filter(x => x.id !== action.id);
      } else if (action.action === 'clear') {
        floatingShareState.saItems = [];
      } else if (action.action === 'full_sync' && Array.isArray(action.items)) {
        floatingShareState.saItems = action.items;
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('floating-bar-action', action);
      }
      return true;
    }
    if (typeof action === 'string' && action.startsWith('annotate:')) {
      if (action === 'annotate:close') {
        closeAnnotateOverlay();
        return true;
      }
      if (action === 'annotate:passthrough:on') {
        if (annotateOverlayWindow && !annotateOverlayWindow.isDestroyed()) {
          annotateOverlayWindow.setIgnoreMouseEvents(true, { forward: true });
        }
        return true;
      }
      if (action === 'annotate:passthrough:off') {
        if (annotateOverlayWindow && !annotateOverlayWindow.isDestroyed()) {
          annotateOverlayWindow.setIgnoreMouseEvents(false);
        }
        return true;
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('floating-bar-action', action);
      }
      return true;
    }
    if (action === 'stop-share') {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('floating-bar-action', 'stop-share');
      }
      exitFloatingShareMode();
      return true;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('floating-bar-action', action);
    }
    return true;
  });

  ipcMain.handle('screen:getSources', async (event, opts) => {
    const options = Object.assign({ types: ['window', 'screen'] }, opts || {});
    return await desktopCapturer.getSources(options);
  });
}

// Ciclo de vida de la aplicación
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });
  configureMediaPermissions();
  setupIPCHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('before-quit', () => {
  hideShareBorderWindow();
  hideFloatingShareBar();
  hideFloatingParticipantsOverlay();
  closeAnnotateOverlay();
});

app.on('will-quit', () => {
  try { globalShortcut.unregister('Escape'); } catch (e) {}
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


// Bloqueo de deep linking y protocolos externos como jitsi-meet://
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (navEvent, url) => {
    if (typeof url === 'string' && url.startsWith('jitsi-meet://')) {
      navEvent.preventDefault();
    }
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });
});
