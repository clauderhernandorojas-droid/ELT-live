const fs = require('fs');

function normalizeNewlines(str) {
  return str.replace(/\r\n/g, '\n');
}

// 1. UPDATE host.html
function updateHost(content) {
  let isCrlf = content.includes('\r\n');
  content = normalizeNewlines(content);

  // 1.1 Replace mountVDONinja URL
  const hostMountOld = `    function mountVDONinja(containerEl, vdoRoom, displayName, isHost = true) {
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
    }`;

  const hostMountNew = `    function mountVDONinja(containerEl, vdoRoom, displayName, isHost = true) {
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

  if (!content.includes(hostMountOld)) {
    throw new Error('Host mountVDONinja match failed');
  }
  content = content.replace(hostMountOld, hostMountNew);

  // 1.2 Update toggleLocalAudio and toggleLocalVideo in host.html
  const hostAudioToggleOld = `      } else if (currentVideoMode === 'jitsi' || currentVideoMode === 'p2p') {
        if (jitsiApiInstance) {
          try { jitsiApiInstance.executeCommand('toggleAudio'); } catch (e) {}
        }
      }`;

  const hostAudioToggleNew = `      } else if (currentVideoMode === 'vdo' || currentVideoMode === 'jitsi' || currentVideoMode === 'p2p') {
        const jContainer = document.getElementById('jitsiDockContainer');
        const vdoIframe = jContainer ? jContainer.querySelector('iframe') : null;
        if (vdoIframe && vdoIframe.contentWindow) {
          try {
            vdoIframe.contentWindow.postMessage({ mic: webrtcAudioEnabled }, '*');
          } catch (e) {}
        }
      }`;

  if (!content.includes(hostAudioToggleOld)) {
    throw new Error('Host toggleLocalAudio match failed');
  }
  content = content.replace(hostAudioToggleOld, hostAudioToggleNew);

  const hostVideoToggleOld = `      } else if (currentVideoMode === 'jitsi' || currentVideoMode === 'p2p') {
        if (jitsiApiInstance) {
          try { jitsiApiInstance.executeCommand('toggleVideo'); } catch (e) {}
        }
      }`;

  const hostVideoToggleNew = `      } else if (currentVideoMode === 'vdo' || currentVideoMode === 'jitsi' || currentVideoMode === 'p2p') {
        const jContainer = document.getElementById('jitsiDockContainer');
        const vdoIframe = jContainer ? jContainer.querySelector('iframe') : null;
        if (vdoIframe && vdoIframe.contentWindow) {
          try {
            vdoIframe.contentWindow.postMessage({ camera: webrtcVideoEnabled }, '*');
          } catch (e) {}
        }
      }`;

  if (!content.includes(hostVideoToggleOld)) {
    throw new Error('Host toggleLocalVideo match failed');
  }
  content = content.replace(hostVideoToggleOld, hostVideoToggleNew);

  if (isCrlf) {
    content = content.replace(/\n/g, '\r\n');
  }
  return content;
}

// 2. UPDATE student.html
function updateStudent(content) {
  let isCrlf = content.includes('\r\n');
  content = normalizeNewlines(content);

  // 2.1 Replace mountVDONinjaStudent URL
  const studentMountOld = `    function mountVDONinjaStudent(containerEl, vdoRoom, displayName) {
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

  const studentMountNew = `    function mountVDONinjaStudent(containerEl, vdoRoom, displayName) {
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

  if (!content.includes(studentMountOld)) {
    throw new Error('Student mountVDONinjaStudent match failed');
  }
  content = content.replace(studentMountOld, studentMountNew);

  // 2.2 Update toggleLocalAudio and toggleLocalVideo in student.html
  const studentAudioToggleOld = `      } else if (currentVideoMode === 'jitsi' || currentVideoMode === 'p2p') {
        if (jitsiApiInstance) {
          try { jitsiApiInstance.executeCommand('toggleAudio'); } catch (e) {}
        }
      }`;

  const studentAudioToggleNew = `      } else if (currentVideoMode === 'vdo' || currentVideoMode === 'jitsi' || currentVideoMode === 'p2p') {
        const jContainer = document.getElementById('jitsiDockContainer');
        const vdoIframe = jContainer ? jContainer.querySelector('iframe') : null;
        if (vdoIframe && vdoIframe.contentWindow) {
          try {
            vdoIframe.contentWindow.postMessage({ mic: webrtcAudioEnabled }, '*');
          } catch (e) {}
        }
      }`;

  if (!content.includes(studentAudioToggleOld)) {
    throw new Error('Student toggleLocalAudio match failed');
  }
  content = content.replace(studentAudioToggleOld, studentAudioToggleNew);

  const studentVideoToggleOld = `        } else if (currentVideoMode === 'jitsi' || currentVideoMode === 'p2p') {
          if (jitsiApiInstance) {
            try { jitsiApiInstance.executeCommand('toggleVideo'); } catch (e) {}
          }
        }`;

  const studentVideoToggleNew = `        } else if (currentVideoMode === 'vdo' || currentVideoMode === 'jitsi' || currentVideoMode === 'p2p') {
          const jContainer = document.getElementById('jitsiDockContainer');
          const vdoIframe = jContainer ? jContainer.querySelector('iframe') : null;
          if (vdoIframe && vdoIframe.contentWindow) {
            try {
              vdoIframe.contentWindow.postMessage({ camera: webrtcVideoEnabled }, '*');
            } catch (e) {}
          }
        }`;

  if (!content.includes(studentVideoToggleOld)) {
    throw new Error('Student toggleLocalVideo match failed');
  }
  content = content.replace(studentVideoToggleOld, studentVideoToggleNew);

  if (isCrlf) {
    content = content.replace(/\n/g, '\r\n');
  }
  return content;
}

// Read and update
const hostSrc = fs.readFileSync('host.html', 'utf8');
const studentSrc = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');

const updatedHost = updateHost(hostSrc);
const updatedStudent = updateStudent(studentSrc);

fs.writeFileSync('host.html', updatedHost, 'utf8');
fs.writeFileSync('ELT LIVE WEB/student.html', updatedStudent, 'utf8');
fs.writeFileSync('ELT LIVE WEB/index.html', updatedStudent, 'utf8');
fs.writeFileSync('student.html', updatedStudent, 'utf8');

console.log('Successfully updated VDO.Ninja URLs and postMessage bridge in host.html, ELT LIVE WEB/student.html, ELT LIVE WEB/index.html, student.html');

