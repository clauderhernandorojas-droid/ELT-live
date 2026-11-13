const fs = require('fs');
const path = require('path');

const hostPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/host.html');
const studentPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/ELT LIVE WEB/student.html');
const indexPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/ELT LIVE WEB/index.html');
const rootStudentPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/student.html');

console.log('Reading host.html and student.html...');
let hostContent = fs.readFileSync(hostPath, 'utf8');
let studentContent = fs.readFileSync(studentPath, 'utf8');

// Normalize line endings to LF for clean regex / replace operations
const hostHadCRLF = hostContent.includes('\r\n');
const studentHadCRLF = studentContent.includes('\r\n');
hostContent = hostContent.replace(/\r\n/g, '\n');
studentContent = studentContent.replace(/\r\n/g, '\n');

// 1. UPDATE ICE SERVERS IN host.html AND student.html
const oldIcePattern = /const WEBRTC_ICE_SERVERS = \{[\s\S]*?iceCandidatePoolSize: 10\s*\};/;
const newIceServers = `const WEBRTC_ICE_SERVERS = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        {
          urls: [
            'turn:openrelay.metered.ca:80',
            'turn:openrelay.metered.ca:443',
            'turn:openrelay.metered.ca:443?transport=tcp',
            'turns:openrelay.metered.ca:443?transport=tcp'
          ],
          username: 'openrelay',
          credential: 'openrelay'
        }
      ],
      iceCandidatePoolSize: 10
    };`;

if (!oldIcePattern.test(hostContent)) {
  console.error('Could not find WEBRTC_ICE_SERVERS in host.html');
  process.exit(1);
}
hostContent = hostContent.replace(oldIcePattern, newIceServers);

if (!oldIcePattern.test(studentContent)) {
  console.error('Could not find WEBRTC_ICE_SERVERS in student.html');
  process.exit(1);
}
studentContent = studentContent.replace(oldIcePattern, newIceServers);

// 2. UPDATE host.html: syncP2PTracksToAllPeers and createAndSendP2POffer
const hostSyncTracksTarget = `    async function syncP2PTracksToAllPeers() {
      if (currentVideoMode !== 'p2p') return;
      for (const remotePeerId of Object.keys(webrtcPeers)) {
        const peerObj = webrtcPeers[remotePeerId];
        if (!peerObj || !peerObj.pc || !p2pLocalStream) continue;

        const pc = peerObj.pc;
        for (const track of p2pLocalStream.getTracks()) {
          if (track.kind === 'video' && isSharingScreen) continue;
          let sender = (track.kind === 'video' ? peerObj.videoSender : peerObj.audioSender);
          if (sender) {
            try { await sender.replaceTrack(track); } catch (e) {}
          } else {
            try {
              const newSender = pc.addTrack(track, p2pLocalStream);
              if (track.kind === 'video') peerObj.videoSender = newSender;
              if (track.kind === 'audio') peerObj.audioSender = newSender;
            } catch (e) {}
          }
        }
      }
    }`;

const hostSyncTracksReplacement = `    async function syncP2PTracksToAllPeers() {
      if (currentVideoMode !== 'p2p') return;
      for (const remotePeerId of Object.keys(webrtcPeers)) {
        const peerObj = webrtcPeers[remotePeerId];
        if (!peerObj || !peerObj.pc || !p2pLocalStream) continue;

        const pc = peerObj.pc;
        const currentVideo = isSharingScreen && screenStream
          ? screenStream.getVideoTracks()[0]
          : (webrtcVideoEnabled && p2pLocalStream ? p2pLocalStream.getVideoTracks()[0] : null);
        const currentAudio = (webrtcAudioEnabled && p2pLocalStream) ? p2pLocalStream.getAudioTracks()[0] : null;

        if (peerObj.videoSender) {
          try { await peerObj.videoSender.replaceTrack(currentVideo || null); } catch (e) {}
        } else if (currentVideo) {
          try {
            peerObj.videoSender = pc.addTrack(currentVideo, p2pLocalStream);
          } catch (e) {}
        }

        if (peerObj.audioSender) {
          try { await peerObj.audioSender.replaceTrack(currentAudio || null); } catch (e) {}
        } else if (currentAudio) {
          try {
            peerObj.audioSender = pc.addTrack(currentAudio, p2pLocalStream);
          } catch (e) {}
        }

        // Disparar renegociación SDP hacia el par remoto para que reciba la pista de inmediato
        try {
          await createAndSendP2POffer(remotePeerId, peerObj.name);
        } catch (e) {}
      }
    }`;

if (!hostContent.includes(hostSyncTracksTarget)) {
  console.error('Could not find syncP2PTracksToAllPeers in host.html');
  process.exit(1);
}
hostContent = hostContent.replace(hostSyncTracksTarget, hostSyncTracksReplacement);

// 3. UPDATE host.html pc.ontrack and updateRemotePeerCardMedia
const hostOntrackTarget = `      pc.ontrack = (evt) => {
        if (evt.track) {
          remoteStream.getTracks().forEach(existing => {
            if (existing.kind === evt.track.kind && existing.id !== evt.track.id) {
              remoteStream.removeTrack(existing);
            }
          });
          if (!remoteStream.getTracks().some(existing => existing.id === evt.track.id)) {
            remoteStream.addTrack(evt.track);
          }
          evt.track.onunmute = () => {
            updateRemotePeerCardMedia(remotePeerId);
          };
        } else if (evt.streams && evt.streams[0]) {
          evt.streams[0].getTracks().forEach(t => {
            if (!remoteStream.getTracks().some(existing => existing.id === t.id)) {
              remoteStream.addTrack(t);
            }
          });
        }
        updateRemotePeerCardMedia(remotePeerId);
      };`;

const hostOntrackReplacement = `      pc.ontrack = (evt) => {
        if (evt.track) {
          remoteStream.getTracks().forEach(existing => {
            if (existing.kind === evt.track.kind && existing.id !== evt.track.id) {
              remoteStream.removeTrack(existing);
            }
          });
          if (!remoteStream.getTracks().some(existing => existing.id === evt.track.id)) {
            remoteStream.addTrack(evt.track);
          }
          if (evt.track.kind === 'video') {
            webrtcPeers[remotePeerId].videoEnabled = true;
          }
          evt.track.onunmute = () => {
            if (evt.track.kind === 'video') {
              webrtcPeers[remotePeerId].videoEnabled = true;
            }
            updateRemotePeerCardMedia(remotePeerId);
          };
        } else if (evt.streams && evt.streams[0]) {
          evt.streams[0].getTracks().forEach(t => {
            if (!remoteStream.getTracks().some(existing => existing.id === t.id)) {
              remoteStream.addTrack(t);
            }
            if (t.kind === 'video') {
              webrtcPeers[remotePeerId].videoEnabled = true;
            }
          });
        }
        updateRemotePeerCardMedia(remotePeerId);
      };`;

if (!hostContent.includes(hostOntrackTarget)) {
  console.error('Could not find pc.ontrack in host.html');
  process.exit(1);
}
hostContent = hostContent.replace(hostOntrackTarget, hostOntrackReplacement);

// 4. UPDATE host.html updateRemotePeerCardMedia
const hostUpdateCardTarget = `        const hasLiveVideo = Boolean(peerObj.videoEnabled) && !peerObj.isSharingScreen;
        vidEl.classList.toggle('hidden', !hasLiveVideo);
        if (phEl) phEl.classList.toggle('hidden', hasLiveVideo);
        if (hasLiveVideo) {
          vidEl.play().catch(() => {});
        }`;

const hostUpdateCardReplacement = `        const hasStreamLiveVideoTrack = peerObj.stream && peerObj.stream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled);
        if (hasStreamLiveVideoTrack) {
          peerObj.videoEnabled = true;
        }
        const hasLiveVideo = (Boolean(peerObj.videoEnabled) || hasStreamLiveVideoTrack) && !peerObj.isSharingScreen;
        vidEl.classList.toggle('hidden', !hasLiveVideo);
        if (phEl) phEl.classList.toggle('hidden', hasLiveVideo);
        if (hasLiveVideo) {
          vidEl.play().catch(() => {});
        }`;

if (!hostContent.includes(hostUpdateCardTarget)) {
  console.error('Could not find updateRemotePeerCardMedia live video check in host.html');
  process.exit(1);
}
hostContent = hostContent.replace(hostUpdateCardTarget, hostUpdateCardReplacement);

// 5. UPDATE host.html WEBRTC_OFFER, WEBRTC_ANSWER, and WEBRTC_ICE with ICE buffering and track attach
const hostOfferTarget = `      channel.on('broadcast', { event: 'WEBRTC_OFFER' }, async ({ payload }) => {
        if (currentVideoMode !== 'p2p') return;
        const fromId = payload && (payload.fromPeerId || payload.from);
        const toId = payload && (payload.toPeerId || payload.to);
        if (!fromId || toId !== webrtcMyPeerId || fromId === webrtcMyPeerId) return;

        try {
          const remoteName = payload.fromName || payload.name || 'Alumno';
          const pc = getOrCreateP2PPeerConnection(fromId, remoteName);
          webrtcPeers[fromId].audioEnabled = Boolean(payload.audioEnabled ?? payload.audio);
          webrtcPeers[fromId].videoEnabled = Boolean(payload.videoEnabled ?? payload.video);
          webrtcPeers[fromId].isSharingScreen = Boolean(payload.isSharingScreen);

          if (pc.signalingState !== 'stable') {
            try { await pc.setLocalDescription({ type: 'rollback' }); } catch (rb) {}
          }
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          channel.send({
            type: 'broadcast',
            event: 'WEBRTC_ANSWER',
            payload: {
              fromPeerId: webrtcMyPeerId,
              from: webrtcMyPeerId,
              fromName: webrtcMyDisplayName,
              name: webrtcMyDisplayName,
              role: 'host',
              toPeerId: fromId,
              to: fromId,
              sdp: pc.localDescription,
              audioEnabled: webrtcAudioEnabled,
              videoEnabled: webrtcVideoEnabled,
              isSharingScreen: isSharingScreen
            }
          });
          updateRemotePeerCardMedia(fromId);
        } catch (e) {
          console.warn('[P2P] Error respondiendo oferta:', e);
        }
      });

      channel.on('broadcast', { event: 'WEBRTC_ANSWER' }, async ({ payload }) => {
        if (currentVideoMode !== 'p2p') return;
        const fromId = payload && (payload.fromPeerId || payload.from);
        const toId = payload && (payload.toPeerId || payload.to);
        if (!fromId || toId !== webrtcMyPeerId || fromId === webrtcMyPeerId) return;

        try {
          const peerObj = webrtcPeers[fromId];
          if (peerObj && peerObj.pc && peerObj.pc.signalingState === 'have-local-offer') {
            await peerObj.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            updateRemotePeerCardMedia(fromId);
          }
        } catch (e) {
          console.warn('[P2P] Error aplicando respuesta:', e);
        }
      });

      channel.on('broadcast', { event: 'WEBRTC_ICE' }, async ({ payload }) => {
        if (currentVideoMode !== 'p2p') return;
        const fromId = payload && (payload.fromPeerId || payload.from);
        const toId = payload && (payload.toPeerId || payload.to);
        if (!fromId || toId !== webrtcMyPeerId || fromId === webrtcMyPeerId) return;

        try {
          const peerObj = webrtcPeers[fromId];
          if (peerObj && peerObj.pc && payload.candidate && peerObj.pc.remoteDescription) {
            await peerObj.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        } catch (e) {}
      });`;

const hostOfferReplacement = `      channel.on('broadcast', { event: 'WEBRTC_OFFER' }, async ({ payload }) => {
        if (currentVideoMode !== 'p2p') return;
        const fromId = payload && (payload.fromPeerId || payload.from);
        const toId = payload && (payload.toPeerId || payload.to);
        if (!fromId || toId !== webrtcMyPeerId || fromId === webrtcMyPeerId) return;

        try {
          const remoteName = payload.fromName || payload.name || 'Alumno';
          const pc = getOrCreateP2PPeerConnection(fromId, remoteName);
          const peerObj = webrtcPeers[fromId];
          if (peerObj) {
            peerObj.audioEnabled = Boolean(payload.audioEnabled ?? payload.audio);
            peerObj.videoEnabled = Boolean(payload.videoEnabled ?? payload.video);
            peerObj.isSharingScreen = Boolean(payload.isSharingScreen);
          }

          if (pc.signalingState !== 'stable') {
            try { await pc.setLocalDescription({ type: 'rollback' }); } catch (rb) {}
          }
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

          // Desahogar candidatos ICE recibidos previamente mientras se esperaba el SDP
          if (peerObj && peerObj.pendingIce && peerObj.pendingIce.length > 0) {
            for (const cand of peerObj.pendingIce) {
              try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
            }
            peerObj.pendingIce = [];
          }

          // Asignar pistas locales de host antes de crear respuesta
          if (p2pLocalStream) {
            const currentVideo = isSharingScreen && screenStream
              ? screenStream.getVideoTracks()[0]
              : (webrtcVideoEnabled ? p2pLocalStream.getVideoTracks()[0] : null);
            const currentAudio = webrtcAudioEnabled ? p2pLocalStream.getAudioTracks()[0] : null;
            if (peerObj && peerObj.videoSender) {
              try { await peerObj.videoSender.replaceTrack(currentVideo || null); } catch (e) {}
            }
            if (peerObj && peerObj.audioSender) {
              try { await peerObj.audioSender.replaceTrack(currentAudio || null); } catch (e) {}
            }
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          channel.send({
            type: 'broadcast',
            event: 'WEBRTC_ANSWER',
            payload: {
              fromPeerId: webrtcMyPeerId,
              from: webrtcMyPeerId,
              fromName: webrtcMyDisplayName,
              name: webrtcMyDisplayName,
              role: 'host',
              toPeerId: fromId,
              to: fromId,
              sdp: pc.localDescription,
              audioEnabled: webrtcAudioEnabled,
              videoEnabled: webrtcVideoEnabled,
              isSharingScreen: isSharingScreen
            }
          });
          updateRemotePeerCardMedia(fromId);
        } catch (e) {
          console.warn('[P2P] Error respondiendo oferta:', e);
        }
      });

      channel.on('broadcast', { event: 'WEBRTC_ANSWER' }, async ({ payload }) => {
        if (currentVideoMode !== 'p2p') return;
        const fromId = payload && (payload.fromPeerId || payload.from);
        const toId = payload && (payload.toPeerId || payload.to);
        if (!fromId || toId !== webrtcMyPeerId || fromId === webrtcMyPeerId) return;

        try {
          const peerObj = webrtcPeers[fromId];
          if (peerObj && peerObj.pc && peerObj.pc.signalingState === 'have-local-offer') {
            if (payload.audioEnabled !== undefined) peerObj.audioEnabled = Boolean(payload.audioEnabled);
            if (payload.videoEnabled !== undefined) peerObj.videoEnabled = Boolean(payload.videoEnabled);
            await peerObj.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

            if (peerObj.pendingIce && peerObj.pendingIce.length > 0) {
              for (const cand of peerObj.pendingIce) {
                try { await peerObj.pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
              }
              peerObj.pendingIce = [];
            }
            updateRemotePeerCardMedia(fromId);
          }
        } catch (e) {
          console.warn('[P2P] Error aplicando respuesta:', e);
        }
      });

      channel.on('broadcast', { event: 'WEBRTC_ICE' }, async ({ payload }) => {
        if (currentVideoMode !== 'p2p') return;
        const fromId = payload && (payload.fromPeerId || payload.from);
        const toId = payload && (payload.toPeerId || payload.to);
        if (!fromId || toId !== webrtcMyPeerId || fromId === webrtcMyPeerId) return;

        try {
          const peerObj = webrtcPeers[fromId];
          if (!peerObj || !peerObj.pc || !payload.candidate) return;
          if (peerObj.pc.remoteDescription && peerObj.pc.remoteDescription.type) {
            await peerObj.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else {
            peerObj.pendingIce = peerObj.pendingIce || [];
            peerObj.pendingIce.push(payload.candidate);
          }
        } catch (e) {}
      });`;

if (!hostContent.includes(hostOfferTarget)) {
  console.error('Could not find WEBRTC_OFFER/ANSWER/ICE block in host.html');
  process.exit(1);
}
hostContent = hostContent.replace(hostOfferTarget, hostOfferReplacement);

// 6. UPDATE host.html: WAITING_ROOM_ADMIT broadcast payload includes videoMode
const hostAdmitTarget = `      roomChannel.send({
        type: 'broadcast',
        event: 'WAITING_ROOM_ADMIT',
        payload: {
          studentId: studentId,
          studentName: st.name
        }
      });`;

const hostAdmitReplacement = `      roomChannel.send({
        type: 'broadcast',
        event: 'WAITING_ROOM_ADMIT',
        payload: {
          studentId: studentId,
          studentName: st.name,
          videoMode: currentVideoMode
        }
      });`;

if (hostContent.includes(hostAdmitTarget)) {
  hostContent = hostContent.replace(hostAdmitTarget, hostAdmitReplacement);
}

// 7. NOW UPDATE student.html:
// In student.html: pc.ontrack, updateStudentRemotePeerCardMedia, WEBRTC_OFFER/ANSWER/ICE, presence listener, STUDENT_JOIN listener, WAITING_ROOM_ADMIT
const studentOntrackTarget = `      pc.ontrack = (evt) => {
        if (evt.track) {
          remoteStream.getTracks().forEach(existing => {
            if (existing.kind === evt.track.kind && existing.id !== evt.track.id) {
              remoteStream.removeTrack(existing);
            }
          });
          if (!remoteStream.getTracks().some(existing => existing.id === evt.track.id)) {
            remoteStream.addTrack(evt.track);
          }
          evt.track.onunmute = () => {
            updateStudentRemotePeerCardMedia(remotePeerId);
          };
        } else if (evt.streams && evt.streams[0]) {
          evt.streams[0].getTracks().forEach(t => {
            if (!remoteStream.getTracks().some(existing => existing.id === t.id)) {
              remoteStream.addTrack(t);
            }
          });
        }
        updateStudentRemotePeerCardMedia(remotePeerId);
      };`;

const studentOntrackReplacement = `      pc.ontrack = (evt) => {
        if (evt.track) {
          remoteStream.getTracks().forEach(existing => {
            if (existing.kind === evt.track.kind && existing.id !== evt.track.id) {
              remoteStream.removeTrack(existing);
            }
          });
          if (!remoteStream.getTracks().some(existing => existing.id === evt.track.id)) {
            remoteStream.addTrack(evt.track);
          }
          if (evt.track.kind === 'video') {
            webrtcPeers[remotePeerId].videoEnabled = true;
          }
          evt.track.onunmute = () => {
            if (evt.track.kind === 'video') {
              webrtcPeers[remotePeerId].videoEnabled = true;
            }
            updateStudentRemotePeerCardMedia(remotePeerId);
          };
        } else if (evt.streams && evt.streams[0]) {
          evt.streams[0].getTracks().forEach(t => {
            if (!remoteStream.getTracks().some(existing => existing.id === t.id)) {
              remoteStream.addTrack(t);
            }
            if (t.kind === 'video') {
              webrtcPeers[remotePeerId].videoEnabled = true;
            }
          });
        }
        updateStudentRemotePeerCardMedia(remotePeerId);
      };`;

if (!studentContent.includes(studentOntrackTarget)) {
  console.error('Could not find pc.ontrack in student.html');
  process.exit(1);
}
studentContent = studentContent.replace(studentOntrackTarget, studentOntrackReplacement);

// 8. UPDATE student.html: updateStudentRemotePeerCardMedia
const studentUpdateMediaTarget = `      if (vidEl) {
        if (currentVideoMode === 'p2p' && peerObj.stream && vidEl.srcObject !== peerObj.stream) {
          vidEl.srcObject = peerObj.stream;
          vidEl.muted = false;
          vidEl.setAttribute('playsinline', '');
          vidEl.setAttribute('webkit-playsinline', '');
          vidEl.setAttribute('autoplay', '');
          vidEl.play().catch(() => {});
        }
        const hasLiveVideo = Boolean(peerObj.videoEnabled) && !peerObj.isSharingScreen;
        vidEl.classList.toggle('hidden', !hasLiveVideo);
        if (phEl) phEl.classList.toggle('hidden', hasLiveVideo);
      }`;

const studentUpdateMediaReplacement = `      if (vidEl) {
        vidEl.setAttribute('playsinline', '');
        vidEl.setAttribute('webkit-playsinline', '');
        vidEl.setAttribute('autoplay', '');
        if (currentVideoMode === 'p2p' && peerObj.stream && vidEl.srcObject !== peerObj.stream) {
          vidEl.srcObject = peerObj.stream;
          vidEl.muted = false;
        }
        const hasStreamLiveVideoTrack = peerObj.stream && peerObj.stream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled);
        if (hasStreamLiveVideoTrack) {
          peerObj.videoEnabled = true;
        }
        const hasLiveVideo = (Boolean(peerObj.videoEnabled) || hasStreamLiveVideoTrack) && !peerObj.isSharingScreen;
        vidEl.classList.toggle('hidden', !hasLiveVideo);
        if (phEl) phEl.classList.toggle('hidden', hasLiveVideo);
        if (hasLiveVideo) {
          vidEl.play().catch(() => {});
        }
      }`;

if (!studentContent.includes(studentUpdateMediaTarget)) {
  console.error('Could not find updateStudentRemotePeerCardMedia video block in student.html');
  process.exit(1);
}
studentContent = studentContent.replace(studentUpdateMediaTarget, studentUpdateMediaReplacement);

// 9. UPDATE student.html: WEBRTC_OFFER, WEBRTC_ANSWER, and WEBRTC_ICE with ICE buffering and track attach
const studentOfferTarget = `      channel.on('broadcast', { event: 'WEBRTC_OFFER' }, async ({ payload }) => {
        if (!isAdmittedToClass || currentVideoMode !== 'p2p') return;
        const fromId = payload && (payload.fromPeerId || payload.from);
        const toId = payload && (payload.toPeerId || payload.to);
        if (!fromId || toId !== webrtcPeerId || fromId === webrtcPeerId) return;

        try {
          const remoteName = payload.fromName || payload.name || 'Profesor (Host)';
          const remoteRole = payload.role || 'host';
          const pc = getOrCreateP2PPeerConnection(fromId, remoteName, remoteRole);
          if (!pc) return;

          if (webrtcPeers[fromId]) {
            webrtcPeers[fromId].audioEnabled = Boolean(payload.audioEnabled ?? payload.audio);
            webrtcPeers[fromId].videoEnabled = Boolean(payload.videoEnabled ?? payload.video);
            webrtcPeers[fromId].isSharingScreen = Boolean(payload.isSharingScreen);
          }

          if (pc.signalingState !== 'stable') {
            try { await pc.setLocalDescription({ type: 'rollback' }); } catch (rb) {}
          }

          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

          // Asignar pistas locales del estudiante a los transceivers antes de crear la respuesta
          if (p2pLocalStream) {
            const vTrack = isSharingScreen && screenStream
              ? screenStream.getVideoTracks()[0]
              : (webrtcVideoEnabled ? p2pLocalStream.getVideoTracks()[0] : null);
            const aTrack = webrtcAudioEnabled ? p2pLocalStream.getAudioTracks()[0] : null;

            if (webrtcPeers[fromId].videoSender) {
              try { await webrtcPeers[fromId].videoSender.replaceTrack(vTrack || null); } catch (e) {}
            }
            if (webrtcPeers[fromId].audioSender) {
              try { await webrtcPeers[fromId].audioSender.replaceTrack(aTrack || null); } catch (e) {}
            }
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          channel.send({
            type: 'broadcast',
            event: 'WEBRTC_ANSWER',
            payload: {
              fromPeerId: webrtcPeerId,
              from: webrtcPeerId,
              fromName: getMyDisplayNameForWebRTC(),
              name: getMyDisplayNameForWebRTC(),
              role: 'student',
              toPeerId: fromId,
              to: fromId,
              sdp: pc.localDescription,
              audioEnabled: webrtcAudioEnabled,
              videoEnabled: webrtcVideoEnabled,
              isSharingScreen: isSharingScreen
            }
          });

          updateStudentRemotePeerCardMedia(fromId);
        } catch (e) {
          console.warn('[P2P] Error respondiendo oferta en Estudiante:', e);
        }
      });

      channel.on('broadcast', { event: 'WEBRTC_ANSWER' }, async ({ payload }) => {
        if (!isAdmittedToClass || currentVideoMode !== 'p2p') return;
        const fromId = payload && (payload.fromPeerId || payload.from);
        const toId = payload && (payload.toPeerId || payload.to);
        if (!fromId || toId !== webrtcPeerId || fromId === webrtcPeerId) return;

        try {
          const peerObj = webrtcPeers[fromId];
          if (peerObj && peerObj.pc && peerObj.pc.signalingState === 'have-local-offer') {
            await peerObj.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            updateStudentRemotePeerCardMedia(fromId);
          }
        } catch (e) {
          console.warn('[P2P] Error aplicando respuesta en Estudiante:', e);
        }
      });

      channel.on('broadcast', { event: 'WEBRTC_ICE' }, async ({ payload }) => {
        if (!isAdmittedToClass || currentVideoMode !== 'p2p') return;
        const fromId = payload && (payload.fromPeerId || payload.from);
        const toId = payload && (payload.toPeerId || payload.to);
        if (!fromId || toId !== webrtcPeerId || fromId === webrtcPeerId) return;

        try {
          const peerObj = webrtcPeers[fromId];
          if (peerObj && peerObj.pc && payload.candidate && peerObj.pc.remoteDescription) {
            await peerObj.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        } catch (e) {}
      });`;

const studentOfferReplacement = `      channel.on('broadcast', { event: 'WEBRTC_OFFER' }, async ({ payload }) => {
        if (!isAdmittedToClass || currentVideoMode !== 'p2p') return;
        const fromId = payload && (payload.fromPeerId || payload.from);
        const toId = payload && (payload.toPeerId || payload.to);
        if (!fromId || toId !== webrtcPeerId || fromId === webrtcPeerId) return;

        try {
          const remoteRole = payload.role || (fromId.startsWith('host_') || (payload.name && payload.name.includes('Profesor')) ? 'host' : 'student');
          const remoteName = payload.fromName || payload.name || (remoteRole === 'host' ? 'Profesor (Host)' : 'Participante');
          const pc = getOrCreateP2PPeerConnection(fromId, remoteName, remoteRole);
          if (!pc) return;

          const peerObj = webrtcPeers[fromId];
          if (peerObj) {
            peerObj.audioEnabled = Boolean(payload.audioEnabled ?? payload.audio);
            peerObj.videoEnabled = Boolean(payload.videoEnabled ?? payload.video);
            peerObj.isSharingScreen = Boolean(payload.isSharingScreen);
          }

          if (pc.signalingState !== 'stable') {
            try { await pc.setLocalDescription({ type: 'rollback' }); } catch (rb) {}
          }

          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

          // Desahogar candidatos ICE recibidos antes de fijar la descripción remota
          if (peerObj && peerObj.pendingIce && peerObj.pendingIce.length > 0) {
            for (const cand of peerObj.pendingIce) {
              try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
            }
            peerObj.pendingIce = [];
          }

          // Asignar pistas locales del estudiante a los transceivers antes de crear la respuesta
          if (p2pLocalStream) {
            const vTrack = isSharingScreen && screenStream
              ? screenStream.getVideoTracks()[0]
              : (webrtcVideoEnabled ? p2pLocalStream.getVideoTracks()[0] : null);
            const aTrack = webrtcAudioEnabled ? p2pLocalStream.getAudioTracks()[0] : null;

            if (peerObj && peerObj.videoSender) {
              try { await peerObj.videoSender.replaceTrack(vTrack || null); } catch (e) {}
            }
            if (peerObj && peerObj.audioSender) {
              try { await peerObj.audioSender.replaceTrack(aTrack || null); } catch (e) {}
            }
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          channel.send({
            type: 'broadcast',
            event: 'WEBRTC_ANSWER',
            payload: {
              fromPeerId: webrtcPeerId,
              from: webrtcPeerId,
              fromName: getMyDisplayNameForWebRTC(),
              name: getMyDisplayNameForWebRTC(),
              role: 'student',
              toPeerId: fromId,
              to: fromId,
              sdp: pc.localDescription,
              audioEnabled: webrtcAudioEnabled,
              videoEnabled: webrtcVideoEnabled,
              isSharingScreen: isSharingScreen
            }
          });

          updateStudentRemotePeerCardMedia(fromId);
        } catch (e) {
          console.warn('[P2P] Error respondiendo oferta en Estudiante:', e);
        }
      });

      channel.on('broadcast', { event: 'WEBRTC_ANSWER' }, async ({ payload }) => {
        if (!isAdmittedToClass || currentVideoMode !== 'p2p') return;
        const fromId = payload && (payload.fromPeerId || payload.from);
        const toId = payload && (payload.toPeerId || payload.to);
        if (!fromId || toId !== webrtcPeerId || fromId === webrtcPeerId) return;

        try {
          const peerObj = webrtcPeers[fromId];
          if (peerObj && peerObj.pc && peerObj.pc.signalingState === 'have-local-offer') {
            if (payload.audioEnabled !== undefined) peerObj.audioEnabled = Boolean(payload.audioEnabled);
            if (payload.videoEnabled !== undefined) peerObj.videoEnabled = Boolean(payload.videoEnabled);
            await peerObj.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

            if (peerObj.pendingIce && peerObj.pendingIce.length > 0) {
              for (const cand of peerObj.pendingIce) {
                try { await peerObj.pc.addIceCandidate(new RTCIceCandidate(cand)); } catch (e) {}
              }
              peerObj.pendingIce = [];
            }
            updateStudentRemotePeerCardMedia(fromId);
          }
        } catch (e) {
          console.warn('[P2P] Error aplicando respuesta en Estudiante:', e);
        }
      });

      channel.on('broadcast', { event: 'WEBRTC_ICE' }, async ({ payload }) => {
        if (!isAdmittedToClass || currentVideoMode !== 'p2p') return;
        const fromId = payload && (payload.fromPeerId || payload.from);
        const toId = payload && (payload.toPeerId || payload.to);
        if (!fromId || toId !== webrtcPeerId || fromId === webrtcPeerId) return;

        try {
          const peerObj = webrtcPeers[fromId];
          if (!peerObj || !peerObj.pc || !payload.candidate) return;
          if (peerObj.pc.remoteDescription && peerObj.pc.remoteDescription.type) {
            await peerObj.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else {
            peerObj.pendingIce = peerObj.pendingIce || [];
            peerObj.pendingIce.push(payload.candidate);
          }
        } catch (e) {}
      });`;

if (!studentContent.includes(studentOfferTarget)) {
  console.error('Could not find WEBRTC_OFFER/ANSWER/ICE block in student.html');
  process.exit(1);
}
studentContent = studentContent.replace(studentOfferTarget, studentOfferReplacement);

// 10. UPDATE student.html: presence listener to create student-to-student peer connection & negotiate
const studentPresenceTarget = `          } else {
            const uCleanName = String(u.name || '').trim().toLowerCase();
            // Ignorar presencias propias (incluyendo sesiones fantasma al recargar la página)
            if (!uCleanName || uCleanName === myCleanName || u.peerId === webrtcPeerId) return;

            activeParticipantKeys.add(uCleanName);
            if (u.name && !peers.includes(u.name)) {
              peers.push(u.name);
            }
            const stuPeerId = (window.__studentLatestPeerByKey && window.__studentLatestPeerByKey[uCleanName]) || u.peerId;
            if (stuPeerId && typeof ensureRemoteVideoCard === 'function') {
              const entry = ensureRemoteVideoCard(stuPeerId, u.name, 'student');
              if (entry && entry.micIconEl) {
                entry.micIconEl.classList.toggle('hidden', Boolean(u.audioEnabled ?? u.audio));
              }
            }
          }`;

const studentPresenceReplacement = `          } else {
            const uCleanName = String(u.name || '').trim().toLowerCase();
            // Ignorar presencias propias (incluyendo sesiones fantasma al recargar la página)
            if (!uCleanName || uCleanName === myCleanName || u.peerId === webrtcPeerId) return;

            activeParticipantKeys.add(uCleanName);
            if (u.name && !peers.includes(u.name)) {
              peers.push(u.name);
            }
            const stuPeerId = (window.__studentLatestPeerByKey && window.__studentLatestPeerByKey[uCleanName]) || u.peerId;
            if (stuPeerId && typeof ensureRemoteVideoCard === 'function') {
              const entry = ensureRemoteVideoCard(stuPeerId, u.name, 'student');
              if (entry && entry.micIconEl) {
                entry.micIconEl.classList.toggle('hidden', Boolean(u.audioEnabled ?? u.audio));
              }
              // Malla P2P entre estudiantes: descubrir al compañero y crear conexión dedicada
              if (currentVideoMode === 'p2p' && isAdmittedToClass) {
                const pc = getOrCreateP2PPeerConnection(stuPeerId, u.name, 'student');
                if (webrtcPeerId < stuPeerId) {
                  if (pc && pc.signalingState === 'stable' && !webrtcPeers[stuPeerId]?.isNegotiating) {
                    createAndSendP2POffer(stuPeerId, u.name, 'student');
                  }
                }
              }
            }
          }`;

if (!studentContent.includes(studentPresenceTarget)) {
  console.error('Could not find presence student handling in student.html');
  process.exit(1);
}
studentContent = studentContent.replace(studentPresenceTarget, studentPresenceReplacement);

// 11. UPDATE student.html: Add STUDENT_JOIN listener in setupWebRTCSignaling
const studentJoinMarker = `      channel.on('broadcast', { event: 'WEBRTC_JOIN' }, async ({ payload }) => {`;
const studentJoinInsertion = `      channel.on('broadcast', { event: 'STUDENT_JOIN' }, async ({ payload }) => {
        if (!payload || !isAdmittedToClass) return;
        const fromPeerId = payload.peerId;
        const fromName = payload.studentName;
        const myCleanName = String(myName || '').trim().toLowerCase();
        const incomingCleanName = String(fromName || '').trim().toLowerCase();
        if (!fromPeerId || fromPeerId === webrtcPeerId || incomingCleanName === myCleanName) return;

        console.log('[P2P Mesh] Estudiante detectado en sala:', fromName, fromPeerId);
        ensureRemoteVideoCard(fromPeerId, fromName, 'student');

        if (currentVideoMode === 'p2p') {
          const pc = getOrCreateP2PPeerConnection(fromPeerId, fromName, 'student');
          channel.send({
            type: 'broadcast',
            event: 'WEBRTC_ANNOUNCE',
            payload: {
              fromPeerId: webrtcPeerId,
              from: webrtcPeerId,
              fromName: getMyDisplayNameForWebRTC(),
              name: getMyDisplayNameForWebRTC(),
              role: 'student',
              videoMode: currentVideoMode,
              toPeerId: fromPeerId,
              to: fromPeerId,
              audioEnabled: webrtcAudioEnabled,
              videoEnabled: webrtcVideoEnabled,
              isSharingScreen: isSharingScreen
            }
          });

          if (webrtcPeerId < fromPeerId) {
            if (pc && pc.signalingState === 'stable' && !webrtcPeers[fromPeerId]?.isNegotiating) {
              await createAndSendP2POffer(fromPeerId, fromName, 'student');
            }
          }
        }
      });\n\n      channel.on('broadcast', { event: 'WEBRTC_JOIN' }, async ({ payload }) => {`;

if (!studentContent.includes(studentJoinMarker)) {
  console.error('Could not find WEBRTC_JOIN in setupWebRTCSignaling in student.html');
  process.exit(1);
}
studentContent = studentContent.replace(studentJoinMarker, studentJoinInsertion);

// 12. UPDATE student.html: WAITING_ROOM_ADMIT listener to notify admitted peers
const studentWaitingAdmitTarget = `      myChannel.on('broadcast', { event: 'WAITING_ROOM_ADMIT' }, ({ payload }) => {
        if (!payload || isAdmittedToClass) return;
        const targetId = payload.studentId;
        const targetName = (payload.studentName || '').trim().toLowerCase();
        const currentName = (myName || '').trim().toLowerCase();

        // Admitir solo si coincide con el studentId o studentName de este alumno
        if ((targetId && targetId === myStudentId) || (targetName && targetName === currentName)) {
          playGentleNotificationBeep();
          admitStudentToClass();
        }
      });`;

const studentWaitingAdmitReplacement = `      myChannel.on('broadcast', { event: 'WAITING_ROOM_ADMIT' }, ({ payload }) => {
        if (!payload) return;
        const targetId = payload.studentId;
        const targetName = (payload.studentName || '').trim().toLowerCase();
        const currentName = (myName || '').trim().toLowerCase();

        if (!isAdmittedToClass) {
          // Admitir solo si coincide con el studentId o studentName de este alumno
          if ((targetId && targetId === myStudentId) || (targetName && targetName === currentName)) {
            if (payload.videoMode) assignedVideoMode = payload.videoMode;
            playGentleNotificationBeep();
            admitStudentToClass();
          }
        } else {
          // Si ya estamos admitidos y entra un nuevo compañero en modo P2P, anunciar presencia tras un breve lapso
          if (targetName && targetName !== currentName && currentVideoMode === 'p2p') {
            setTimeout(() => {
              if (typeof announceWebRTCPresence === 'function') {
                announceWebRTCPresence();
              }
            }, 600);
          }
        }
      });`;

if (!studentContent.includes(studentWaitingAdmitTarget)) {
  console.error('Could not find WAITING_ROOM_ADMIT in student.html');
  process.exit(1);
}
studentContent = studentContent.replace(studentWaitingAdmitTarget, studentWaitingAdmitReplacement);

// 13. UPDATE student.html: cleanupOrphanStudentVideoCards to protect active connections
const studentCleanupTarget = `    function cleanupOrphanStudentVideoCards(activeParticipantKeys) {
      const strip = document.getElementById('webrtcVideoStrip');
      Object.keys(webrtcPeers).forEach(pid => {
        const p = webrtcPeers[pid];
        if (!p) return;
        const dedupKey = getParticipantDedupKey(p.name, p.role);
        if (activeParticipantKeys && dedupKey && !activeParticipantKeys.has(dedupKey)) {
          removeStudentRemoteVideoCard(pid, p.name, p.role);
        }
      });

      if (strip) {
        const seenKeys = new Set();
        strip.querySelectorAll('[data-student-name]').forEach(cardEl => {
          const dKey = cardEl.getAttribute('data-student-name') || '';
          if (!dKey) return;
          if (seenKeys.has(dKey)) {
            cardEl.remove();
            return;
          }
          if (activeParticipantKeys && activeParticipantKeys.size > 0 && !activeParticipantKeys.has(dKey)) {
            cardEl.remove();
            return;
          }
          seenKeys.add(dKey);
        });
      }`;

const studentCleanupReplacement = `    function cleanupOrphanStudentVideoCards(activeParticipantKeys) {
      const strip = document.getElementById('webrtcVideoStrip');
      Object.keys(webrtcPeers).forEach(pid => {
        const p = webrtcPeers[pid];
        if (!p) return;
        // Proteger conexiones P2P activas o en proceso de conexión
        if (p.pc && (p.pc.connectionState === 'connected' || p.pc.connectionState === 'connecting')) {
          return;
        }
        const dedupKey = getParticipantDedupKey(p.name, p.role);
        if (activeParticipantKeys && dedupKey && !activeParticipantKeys.has(dedupKey)) {
          removeStudentRemoteVideoCard(pid, p.name, p.role);
        }
      });

      if (strip) {
        const seenKeys = new Set();
        strip.querySelectorAll('[data-student-name]').forEach(cardEl => {
          const dKey = cardEl.getAttribute('data-student-name') || '';
          if (!dKey) return;
          if (seenKeys.has(dKey)) {
            cardEl.remove();
            return;
          }
          const pid = cardEl.getAttribute('data-peer-id');
          const p = pid ? webrtcPeers[pid] : null;
          if (p && p.pc && (p.pc.connectionState === 'connected' || p.pc.connectionState === 'connecting')) {
            seenKeys.add(dKey);
            return;
          }
          if (activeParticipantKeys && activeParticipantKeys.size > 0 && !activeParticipantKeys.has(dKey)) {
            cardEl.remove();
            return;
          }
          seenKeys.add(dKey);
        });
      }`;

if (!studentContent.includes(studentCleanupTarget)) {
  console.error('Could not find cleanupOrphanStudentVideoCards in student.html');
  process.exit(1);
}
studentContent = studentContent.replace(studentCleanupTarget, studentCleanupReplacement);

// Restore line endings
if (hostHadCRLF) hostContent = hostContent.replace(/\n/g, '\r\n');
if (studentHadCRLF) studentContent = studentContent.replace(/\n/g, '\r\n');

// Write host.html and ELT LIVE WEB/student.html
fs.writeFileSync(hostPath, hostContent, 'utf8');
fs.writeFileSync(studentPath, studentContent, 'utf8');

// Copy student.html to ELT LIVE WEB/index.html and root student.html
fs.writeFileSync(indexPath, studentContent, 'utf8');
fs.writeFileSync(rootStudentPath, studentContent, 'utf8');

console.log('Successfully updated host.html and synchronized student.html across all 3 locations!');

