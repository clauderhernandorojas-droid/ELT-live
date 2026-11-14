const fs = require('fs');

function normalizeNewlines(str) {
  return str.replace(/\r\n/g, '\n');
}

// 1. UPDATE Electron main files: main.js, main-host.js, main-student.js
function updateMainFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let isCrlf = content.includes('\r\n');
  content = normalizeNewlines(content);

  const whenReadyTarget = `app.whenReady().then(() => {
  configureMediaPermissions();`;

  const whenReadyReplacement = `app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });
  configureMediaPermissions();`;

  if (content.includes(whenReadyTarget)) {
    content = content.replace(whenReadyTarget, whenReadyReplacement);
  } else {
    console.warn(`Target not found in ${filePath}, checking if already added`);
  }

  if (isCrlf) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${filePath}`);
}

updateMainFile('main.js');
updateMainFile('main-host.js');
updateMainFile('main-student.js');

// 2. UPDATE host.html
function updateHost() {
  let content = fs.readFileSync('host.html', 'utf8');
  let isCrlf = content.includes('\r\n');
  content = normalizeNewlines(content);

  const hostMountOld = `    function mountVDONinja(containerEl, vdoRoom, displayName, isHost = true) {
      if (!containerEl || !vdoRoom) return null;
      containerEl.innerHTML = '';

      const pin = roomPin || '0000';
      const pushParam = isHost ? \`Host_\${pin}\` : \`Stu_\${encodeURIComponent(displayName || 'Alumno')}_\${Math.floor(Math.random() * 999)}\`;
      const labelParam = isHost ? 'Profesor' : encodeURIComponent(displayName || 'Alumno');

      const iframeUrl = \`https://vdo.ninja/?room=\${encodeURIComponent(vdoRoom)}&push=\${pushParam}&label=\${labelParam}&webcam&mic&quality=2&autostart&noheader&transparent\`;

      const iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.setAttribute('allow', 'camera; microphone; fullscreen; display-capture; autoplay');
      containerEl.appendChild(iframe);

      // Al montar con &webcam&mic, sincronizar estado activo en la barra inferior
      webrtcAudioEnabled = true;
      webrtcVideoEnabled = true;

      return iframe;
    }`;

  const hostMountNew = `    function mountVDONinja(containerEl, vdoRoom, displayName, isHost = true) {
      if (!containerEl || !vdoRoom) return null;
      containerEl.innerHTML = '';

      const pin = roomPin || '0000';
      const pushParam = isHost ? \`Host_\${pin}\` : \`Stu_\${encodeURIComponent(displayName || 'Alumno')}_\${Math.floor(Math.random() * 999)}\`;
      const labelParam = isHost ? 'Profesor' : encodeURIComponent(displayName || 'Alumno');

      const iframeUrl = \`https://vdo.ninja/?room=\${encodeURIComponent(vdoRoom)}&push=\${pushParam}&label=\${labelParam}&scene&webcam&mic&quality=2&autostart&cleanoutput&nocontrols&noheader&nosettings&nochat&nofileshare&hidehome&transparent\`;

      const iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.style.pointerEvents = 'none';
      iframe.setAttribute('allow', 'camera *; microphone *; fullscreen *; display-capture *; autoplay *');
      containerEl.appendChild(iframe);

      // Al montar con &webcam&mic, sincronizar estado activo en la barra inferior
      webrtcAudioEnabled = true;
      webrtcVideoEnabled = true;

      return iframe;
    }`;

  if (!content.includes(hostMountOld)) {
    throw new Error('Host mountVDONinja match failed');
  }
  content = content.replace(hostMountOld, hostMountNew);

  if (isCrlf) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync('host.html', content, 'utf8');
  console.log('Updated host.html');
}

updateHost();

// 3. UPDATE student.html
function updateStudent() {
  let content = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');
  let isCrlf = content.includes('\r\n');
  content = normalizeNewlines(content);

  const studentMountOld = `    function mountVDONinjaStudent(containerEl, vdoRoom, displayName) {
      if (!containerEl || !vdoRoom) return null;
      containerEl.innerHTML = '';

      const safeName = displayName || myName || 'Alumno';
      const rand = Math.floor(Math.random() * 999);
      const pushParam = \`Stu_\${encodeURIComponent(safeName)}_\${rand}\`;
      const labelParam = encodeURIComponent(safeName);

      const iframeUrl = \`https://vdo.ninja/?room=\${encodeURIComponent(vdoRoom)}&push=\${pushParam}&label=\${labelParam}&webcam&mic&quality=2&autostart&noheader&transparent\`;

      const iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.setAttribute('allow', 'camera; microphone; fullscreen; display-capture; autoplay');
      containerEl.appendChild(iframe);

      // Al montar con &webcam&mic, sincronizar estado activo en la barra inferior
      webrtcAudioEnabled = true;
      webrtcVideoEnabled = true;

      return iframe;
    }`;

  const studentMountNew = `    function mountVDONinjaStudent(containerEl, vdoRoom, displayName) {
      if (!containerEl || !vdoRoom) return null;
      containerEl.innerHTML = '';

      const safeName = displayName || myName || 'Alumno';
      const rand = Math.floor(Math.random() * 999);
      const pushParam = \`Stu_\${encodeURIComponent(safeName)}_\${rand}\`;
      const labelParam = encodeURIComponent(safeName);

      const iframeUrl = \`https://vdo.ninja/?room=\${encodeURIComponent(vdoRoom)}&push=\${pushParam}&label=\${labelParam}&scene&webcam&mic&quality=2&autostart&cleanoutput&nocontrols&noheader&nosettings&nochat&nofileshare&hidehome&transparent\`;

      const iframe = document.createElement('iframe');
      iframe.src = iframeUrl;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      iframe.style.pointerEvents = 'none';
      iframe.setAttribute('allow', 'camera *; microphone *; fullscreen *; display-capture *; autoplay *');
      containerEl.appendChild(iframe);

      // Al montar con &webcam&mic, sincronizar estado activo en la barra inferior
      webrtcAudioEnabled = true;
      webrtcVideoEnabled = true;

      return iframe;
    }`;

  if (!content.includes(studentMountOld)) {
    throw new Error('Student mountVDONinjaStudent match failed');
  }
  content = content.replace(studentMountOld, studentMountNew);

  if (isCrlf) content = content.replace(/\n/g, '\r\n');
  fs.writeFileSync('ELT LIVE WEB/student.html', content, 'utf8');
  fs.writeFileSync('ELT LIVE WEB/index.html', content, 'utf8');
  fs.writeFileSync('student.html', content, 'utf8');
  console.log('Updated ELT LIVE WEB/student.html, ELT LIVE WEB/index.html, and student.html');
}

updateStudent();

