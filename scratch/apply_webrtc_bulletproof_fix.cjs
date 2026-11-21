const fs = require('fs');
const path = require('path');

console.log('=== INICIANDO APLICACIÓN DEL PLAN QUIRÚRGICO WEBRTC ===');

// 1. MODIFICAR HOST.HTML
let host = fs.readFileSync('host.html', 'utf8');

// 1.1 Corregir selector #webrtcRemoteCardsContainer -> #webrtcRemoteCards
const oldHostSelector = "const remoteVideos = document.querySelectorAll('#webrtcRemoteCardsContainer video');";
const newHostSelector = "const remoteVideos = document.querySelectorAll('#webrtcRemoteCards video');";
if (host.includes(oldHostSelector)) {
  host = host.replace(oldHostSelector, newHostSelector);
  console.log('✓ host.html: Selector corregido a #webrtcRemoteCards');
} else {
  console.log('! host.html: selector ya estaba corregido o no encontrado');
}

// 1.2 Eliminar listener duplicado de WEBRTC_ANSWER en host.html
const dupHostAnswer = `      channel.on('broadcast', { event: 'WEBRTC_ANSWER' }, async ({ payload }) => {
        if (currentVideoMode !== 'p2p') return;
        const fromId = payload && (payload.fromPeerId || payload.from);
        const toId = payload && (payload.toPeerId || payload.to);
      });`;
if (host.includes(dupHostAnswer)) {
  host = host.replace(dupHostAnswer, '');
  console.log('✓ host.html: Listener duplicado de WEBRTC_ANSWER eliminado');
}

// 1.3 Mejorar toggleLocalVideo en host.html para adquirir video si la cámara estaba apagada
const oldHostToggleCam = `      } else if (currentVideoMode === 'p2p') {
        if (!p2pLocalStream) {
          await ensureP2PLocalStream(webrtcAudioEnabled, webrtcVideoEnabled);
        }
        if (p2pLocalStream) {
          p2pLocalStream.getVideoTracks().forEach(t => { t.enabled = webrtcVideoEnabled; });
        }
        handleP2PLocalVideoUI();
        await syncP2PTracksToAllPeers();
      }`;

const newHostToggleCam = `      } else if (currentVideoMode === 'p2p') {
        if (!p2pLocalStream || (webrtcVideoEnabled && (!p2pLocalStream.getVideoTracks().length || !p2pLocalStream.getVideoTracks().some(t => t.readyState === 'live')))) {
          await ensureP2PLocalStream(webrtcAudioEnabled, webrtcVideoEnabled);
        }
        if (p2pLocalStream) {
          p2pLocalStream.getVideoTracks().forEach(t => { t.enabled = webrtcVideoEnabled; });
        }
        handleP2PLocalVideoUI();
        await syncP2PTracksToAllPeers();
      }`;

if (host.includes(oldHostToggleCam)) {
  host = host.replace(oldHostToggleCam, newHostToggleCam);
  console.log('✓ host.html: toggleLocalVideo blindado para adquirir pista de cámara en caliente');
} else {
  console.log('! host.html: toggleLocalVideo no encontrado con patrón exacto');
}

// 1.4 Mejorar syncP2PTracksToAllPeers en host.html
const oldHostSyncP2P = `        if (peerObj.videoSender) {
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
        } catch (e) {}`;

const newHostSyncP2P = `        if (peerObj.videoSender) {
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

        // Asegurar transceivers en sendrecv para permitir intercambio bidireccional continuo
        try {
          pc.getTransceivers().forEach(tr => {
            if (tr.direction !== 'sendrecv') tr.direction = 'sendrecv';
          });
        } catch (e) {}

        // Disparar renegociación SDP hacia el par remoto para que reciba la pista de inmediato
        try {
          await createAndSendP2POffer(remotePeerId, peerObj.name);
        } catch (e) {}`;

if (host.includes(oldHostSyncP2P)) {
  host = host.replace(oldHostSyncP2P, newHostSyncP2P);
  console.log('✓ host.html: syncP2PTracksToAllPeers transceivers configurados en sendrecv');
}

// 1.5 Blindaje contra poda prematura en cleanupOrphanRemotePeerCards (host.html)
const oldHostCleanup = `    function cleanupOrphanRemotePeerCards(activePeerIds, activeStudentNames) {
      Object.keys(webrtcPeers).forEach(pid => {
        const p = webrtcPeers[pid];
        const cleanName = normalizeStudentPeerKey(p && p.name);
        if (activeStudentNames && cleanName && !activeStudentNames.has(cleanName)) {
          if (!activePeerIds || !activePeerIds.has(pid)) {
            removeRemotePeerCard(pid, p.name);
          }
        }
      });

      if (webrtcRemoteCardsContainer) {
        const seenNames = new Set();
        const cards = Array.from(webrtcRemoteCardsContainer.children);
        cards.forEach(cardEl => {
          const sName = cardEl.getAttribute('data-student-name') || '';
          if (sName) {
            if (seenNames.has(sName)) {
              cardEl.remove();
              return;
            }
            if (activeStudentNames && activeStudentNames.size > 0 && !activeStudentNames.has(sName)) {
              cardEl.remove();
              return;
            }
            seenNames.add(sName);
          }
        });
      }`;

const newHostCleanup = `    function cleanupOrphanRemotePeerCards(activePeerIds, activeStudentNames) {
      Object.keys(webrtcPeers).forEach(pid => {
        const p = webrtcPeers[pid];
        if (!p) return;
        // Blindaje: No podar si la conexión P2P está conectada, conectando o con señalización activa
        if (p.pc && (p.pc.connectionState === 'connected' || p.pc.connectionState === 'connecting' || p.pc.signalingState !== 'closed')) {
          return;
        }
        const cleanName = normalizeStudentPeerKey(p && p.name);
        // Blindaje: No podar si el alumno está registrado como admitido en studentsState
        if (cleanName && typeof studentsState === 'object' && studentsState) {
          const isAdmitted = Object.values(studentsState).some(st => normalizeStudentPeerKey(st.name || st.student_name) === cleanName);
          if (isAdmitted) return;
        }
        if (activeStudentNames && cleanName && !activeStudentNames.has(cleanName)) {
          if (!activePeerIds || !activePeerIds.has(pid)) {
            removeRemotePeerCard(pid, p.name);
          }
        }
      });

      if (webrtcRemoteCardsContainer) {
        const seenNames = new Set();
        const cards = Array.from(webrtcRemoteCardsContainer.children);
        cards.forEach(cardEl => {
          const sName = cardEl.getAttribute('data-student-name') || '';
          if (sName) {
            if (seenNames.has(sName)) {
              cardEl.remove();
              return;
            }
            if (activeStudentNames && activeStudentNames.size > 0 && !activeStudentNames.has(sName)) {
              if (typeof studentsState === 'object' && studentsState) {
                const isAdmitted = Object.values(studentsState).some(st => normalizeStudentPeerKey(st.name || st.student_name) === sName);
                if (isAdmitted) {
                  seenNames.add(sName);
                  return;
                }
              }
              cardEl.remove();
              return;
            }
            seenNames.add(sName);
          }
        });
      }`;

if (host.includes(oldHostCleanup)) {
  host = host.replace(oldHostCleanup, newHostCleanup);
  console.log('✓ host.html: cleanupOrphanRemotePeerCards blindado contra poda prematura');
} else {
  console.log('! host.html: cleanupOrphanRemotePeerCards no encontrado con patrón exacto');
}

// 1.6 Blindaje de Avatar y Detección de Frames Reales en updateRemotePeerCardMedia (host.html)
const oldHostUpdateMedia = `        const hasStreamLiveVideoTrack = peerObj.stream && peerObj.stream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled);
        if (hasStreamLiveVideoTrack) {
          peerObj.videoEnabled = true;
        }
        const hasLiveVideo = (Boolean(peerObj.videoEnabled) || hasStreamLiveVideoTrack) && !peerObj.isSharingScreen;
        vidEl.classList.toggle('hidden', !hasLiveVideo);
        if (phEl) phEl.classList.toggle('hidden', hasLiveVideo);
        if (hasLiveVideo) {
          vidEl.play().catch(() => {});
        }`;

const newHostUpdateMedia = `        if (!vidEl.__frameDetectionAttached) {
          vidEl.__frameDetectionAttached = true;
          const onFrameReady = () => {
            if (peerObj.videoEnabled && !peerObj.isSharingScreen && vidEl.videoWidth > 0 && !vidEl.paused) {
              vidEl.classList.remove('hidden');
              if (phEl) phEl.classList.add('hidden');
            }
          };
          vidEl.addEventListener('loadedmetadata', onFrameReady);
          vidEl.addEventListener('playing', onFrameReady);
          vidEl.addEventListener('timeupdate', onFrameReady);
          vidEl.addEventListener('pause', () => {
            if (vidEl.paused && phEl) {
              vidEl.classList.add('hidden');
              phEl.classList.remove('hidden');
            }
          });
        }

        const hasStreamLiveVideoTrack = peerObj.stream && peerObj.stream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled && !t.muted);
        if (hasStreamLiveVideoTrack) {
          peerObj.videoEnabled = true;
        }
        const hasLiveDecodedFrames = vidEl.videoWidth > 0 && !vidEl.paused && vidEl.readyState >= 2;
        const shouldShowVideo = Boolean(peerObj.videoEnabled) && hasStreamLiveVideoTrack && hasLiveDecodedFrames && !peerObj.isSharingScreen;

        vidEl.classList.toggle('hidden', !shouldShowVideo);
        if (phEl) phEl.classList.toggle('hidden', shouldShowVideo);

        if (peerObj.videoEnabled && hasStreamLiveVideoTrack) {
          vidEl.play().catch(() => {});
        }`;

if (host.includes(oldHostUpdateMedia)) {
  host = host.replace(oldHostUpdateMedia, newHostUpdateMedia);
  console.log('✓ host.html: updateRemotePeerCardMedia blindado contra pantalla negra');
} else {
  console.log('! host.html: updateRemotePeerCardMedia no encontrado con patrón exacto');
}

fs.writeFileSync('host.html', host, 'utf8');
console.log('✓ host.html guardado exitosamente');


// 2. MODIFICAR ELT LIVE WEB/student.html
let student = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');

// 2.1 CSS de Modo Galería y corrección de la franja gris móvil + display: contents en #webrtcRemoteCards
const oldStudentCssStart = `    /* Estilos del Modo Galería tipo Zoom Gigante (cuando no hay lección/pizarra/screen share) */`;
const oldStudentCssEnd = `    /* Controles táctiles permanentes en móviles y dispositivos sin hover */`;

const startIdx = student.indexOf(oldStudentCssStart);
const endIdx = student.indexOf(oldStudentCssEnd);

if (startIdx !== -1 && endIdx !== -1) {
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
      /* Cuadrícula por defecto para 2 participantes */
      grid-template-columns: repeat(2, 1fr) !important;
      grid-template-rows: 1fr !important;
    }
    /* #webrtcRemoteCards se desenvuelve como contents para que cada tarjeta remota y la local participen como celdas hermanas en el grid */
    #webrtcVideoStrip.gallery-mode #webrtcRemoteCards {
      display: contents !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcRemoteCards:empty {
      display: none !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcLocalCard {
      order: 99 !important;
      margin: 0 !important;
    }
    /* Cuadrículas responsivas según número de participantes en PC */
    #webrtcVideoStrip.gallery-mode.gallery-count-1 #webrtcStripExpandedBody {
      grid-template-columns: 1fr !important;
      grid-template-rows: 1fr !important;
    }
    #webrtcVideoStrip.gallery-mode.gallery-count-2 #webrtcStripExpandedBody {
      grid-template-columns: repeat(2, 1fr) !important;
      grid-template-rows: 1fr !important;
    }
    #webrtcVideoStrip.gallery-mode.gallery-count-3 #webrtcStripExpandedBody {
      grid-template-columns: repeat(3, 1fr) !important;
      grid-template-rows: 1fr !important;
    }
    #webrtcVideoStrip.gallery-mode.gallery-count-4 #webrtcStripExpandedBody {
      grid-template-columns: repeat(2, 1fr) !important;
      grid-template-rows: repeat(2, 1fr) !important;
    }
    #webrtcVideoStrip.gallery-mode.gallery-count-many #webrtcStripExpandedBody {
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important;
      grid-template-rows: repeat(auto-fit, minmax(200px, 1fr)) !important;
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
    }
    /* Contenedores de video al 100% absoluto para evitar franjas laterales */
    #webrtcVideoStrip.gallery-mode video {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      min-width: 0 !important;
      min-height: 0 !important;
      object-fit: cover !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcLocalVideo {
      transform: scaleX(-1) !important;
      transform-origin: center center !important;
    }
    #webrtcVideoStrip.gallery-mode video:not(.hidden) {
      display: block !important;
    }
    #webrtcVideoStrip.gallery-mode video.hidden {
      display: none !important;
    }
    /* Placeholders con avatares centrados */
    #webrtcVideoStrip.gallery-mode #webrtcLocalPlaceholder,
    #webrtcVideoStrip.gallery-mode [data-role="placeholder"] {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      justify-content: center !important;
      background-color: #111317 !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcLocalPlaceholder:not(.hidden),
    #webrtcVideoStrip.gallery-mode [data-role="placeholder"]:not(.hidden) {
      display: flex !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcLocalPlaceholder.hidden,
    #webrtcVideoStrip.gallery-mode [data-role="placeholder"].hidden {
      display: none !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcLocalAvatarInitial,
    #webrtcVideoStrip.gallery-mode [data-role="placeholder"] .rounded-full {
      width: 90px !important;
      height: 90px !important;
      font-size: 36px !important;
      margin-bottom: 0.5rem !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcLocalNameTag,
    #webrtcVideoStrip.gallery-mode [data-role="name"] {
      position: absolute !important;
      bottom: 0.75rem !important;
      left: 0.75rem !important;
      font-size: 13px !important;
      padding: 0.25rem 0.6rem !important;
      background-color: rgba(0, 0, 0, 0.75) !important;
      border-radius: 6px !important;
      z-index: 10 !important;
    }
    #webrtcVideoStrip.gallery-mode #webrtcLocalMuteIcon,
    #webrtcVideoStrip.gallery-mode [data-role="mute"] {
      position: absolute !important;
      top: 0.75rem !important;
      right: 0.75rem !important;
      width: 28px !important;
      height: 28px !important;
      font-size: 13px !important;
      z-index: 10 !important;
    }
    #wbViewport, #wbCanvas {
      touch-action: none;
    }
    @media (max-width: 768px) {
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
      /* Modo Galería Zoom en pantallas móviles (max-width: 768px): tarjetas ocupando el alto responsivo */
      #webrtcVideoStrip.gallery-mode {
        padding: 0.75rem !important;
        gap: 0.75rem !important;
      }
      #webrtcVideoStrip.gallery-mode #webrtcStripExpandedBody {
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
      /* 3 participantes en móvil vertical: 3 tarjetas apiladas al 33.3% alto cada una */
      #webrtcVideoStrip.gallery-mode.gallery-count-3 #webrtcStripExpandedBody {
        grid-template-columns: 1fr !important;
        grid-template-rows: repeat(3, 1fr) !important;
      }
      /* 4 participantes en móvil: cuadrícula 2x2 */
      #webrtcVideoStrip.gallery-mode.gallery-count-4 #webrtcStripExpandedBody {
        grid-template-columns: repeat(2, 1fr) !important;
        grid-template-rows: repeat(2, 1fr) !important;
      }
      #webrtcVideoStrip.gallery-mode.gallery-count-many #webrtcStripExpandedBody {
        grid-template-columns: repeat(2, 1fr) !important;
        grid-template-rows: repeat(auto-fit, minmax(160px, 1fr)) !important;
      }
      #webrtcVideoStrip.gallery-mode #webrtcLocalAvatarInitial,
      #webrtcVideoStrip.gallery-mode [data-role="placeholder"] .rounded-full {
        width: 72px !important;
        height: 72px !important;
        font-size: 28px !important;
      }
    }
`;
  student = student.substring(0, startIdx) + newGalleryCss + student.substring(endIdx);
  console.log('✓ student.html: CSS de Modo Galería y video responsivo actualizado');
} else {
  console.error('! ERROR: No se pudieron encontrar las marcas de CSS en student.html');
}

// 2.2 Blindaje contra franja vertical en webrtcLocalVideo (DOM)
const oldLocalVideoTag = '<video id="webrtcLocalVideo" autoplay playsinline webkit-playsinline muted class="w-full h-full object-cover transform scale-x-[-1] hidden"></video>';
const newLocalVideoTag = '<video id="webrtcLocalVideo" autoplay playsinline webkit-playsinline muted class="absolute inset-0 w-full h-full object-cover transform scale-x-[-1] hidden"></video>';
if (student.includes(oldLocalVideoTag)) {
  student = student.replace(oldLocalVideoTag, newLocalVideoTag);
  console.log('✓ student.html: #webrtcLocalVideo fijado con position absolute inset-0');
}

// 2.3 Eliminar listener duplicado de WEBRTC_ANSWER en student.html
const dupStudentAnswer = `      channel.on('broadcast', { event: 'WEBRTC_ANSWER' }, async ({ payload }) => {
        if (!isAdmittedToClass || currentVideoMode !== 'p2p') return;
        const fromId = payload && (payload.fromPeerId || payload.from);
      });`;
if (student.includes(dupStudentAnswer)) {
  student = student.replace(dupStudentAnswer, '');
  console.log('✓ student.html: Listener duplicado de WEBRTC_ANSWER eliminado');
}

// 2.4 Mejorar toggleLocalVideo en student.html para adquirir cámara en caliente
const oldStudentToggleCam = `        } else if (currentVideoMode === 'p2p') {
          if (!p2pLocalStream) {
            await ensureP2PLocalStream(webrtcAudioEnabled, webrtcVideoEnabled);
          }
          if (p2pLocalStream) {
            p2pLocalStream.getVideoTracks().forEach(t => { t.enabled = webrtcVideoEnabled; });
          }
          try { handleP2PLocalVideoUI(); } catch (e) {}
          await syncP2PTracksToAllPeers();
        }`;

const newStudentToggleCam = `        } else if (currentVideoMode === 'p2p') {
          if (!p2pLocalStream || (webrtcVideoEnabled && (!p2pLocalStream.getVideoTracks().length || !p2pLocalStream.getVideoTracks().some(t => t.readyState === 'live')))) {
            await ensureP2PLocalStream(webrtcAudioEnabled, webrtcVideoEnabled);
          }
          if (p2pLocalStream) {
            p2pLocalStream.getVideoTracks().forEach(t => { t.enabled = webrtcVideoEnabled; });
          }
          try { handleP2PLocalVideoUI(); } catch (e) {}
          await syncP2PTracksToAllPeers();
        }`;

if (student.includes(oldStudentToggleCam)) {
  student = student.replace(oldStudentToggleCam, newStudentToggleCam);
  console.log('✓ student.html: toggleLocalVideo blindado para adquirir pista de cámara en caliente');
}

// 2.5 Mejorar syncP2PTracksToAllPeers en student.html
const oldStudentSyncP2P = `        const currentTrack = isSharingScreen && screenStream
          ? screenStream.getVideoTracks()[0]
          : (webrtcVideoEnabled && p2pLocalStream ? p2pLocalStream.getVideoTracks()[0] : null);

        if (peerObj.videoSender) {
          try { await peerObj.videoSender.replaceTrack(currentTrack || null); } catch (e) {}
        } else if (currentTrack) {
          try {
            peerObj.videoSender = peerObj.pc.addTrack(currentTrack, p2pLocalStream);
          } catch (e) {}
        }

        const micTrack = (webrtcAudioEnabled && p2pLocalStream) ? p2pLocalStream.getAudioTracks()[0] : null;
        if (peerObj.audioSender) {
          try { await peerObj.audioSender.replaceTrack(micTrack || null); } catch (e) {}
        } else if (micTrack) {
          try {
            peerObj.audioSender = peerObj.pc.addTrack(micTrack, p2pLocalStream);
          } catch (e) {}
        }

        // Disparar renegociación SDP hacia el par remoto para que reciba la pista de inmediato
        await createAndSendP2POffer(remotePeerId, peerObj.name, peerObj.role);`;

const newStudentSyncP2P = `        const currentTrack = isSharingScreen && screenStream
          ? screenStream.getVideoTracks()[0]
          : (webrtcVideoEnabled && p2pLocalStream ? p2pLocalStream.getVideoTracks().find(t => t.readyState === 'live') || null : null);

        if (peerObj.videoSender) {
          try { await peerObj.videoSender.replaceTrack(currentTrack || null); } catch (e) {}
        } else if (currentTrack) {
          try {
            peerObj.videoSender = peerObj.pc.addTrack(currentTrack, p2pLocalStream);
          } catch (e) {}
        }

        const micTrack = (webrtcAudioEnabled && p2pLocalStream) ? p2pLocalStream.getAudioTracks().find(t => t.readyState === 'live') || null : null;
        if (peerObj.audioSender) {
          try { await peerObj.audioSender.replaceTrack(micTrack || null); } catch (e) {}
        } else if (micTrack) {
          try {
            peerObj.audioSender = peerObj.pc.addTrack(micTrack, p2pLocalStream);
          } catch (e) {}
        }

        // Asegurar transceivers en sendrecv
        try {
          peerObj.pc.getTransceivers().forEach(tr => {
            if (tr.direction !== 'sendrecv') tr.direction = 'sendrecv';
          });
        } catch (e) {}

        // Disparar renegociación SDP hacia el par remoto para que reciba la pista de inmediato
        await createAndSendP2POffer(remotePeerId, peerObj.name, peerObj.role);`;

if (student.includes(oldStudentSyncP2P)) {
  student = student.replace(oldStudentSyncP2P, newStudentSyncP2P);
  console.log('✓ student.html: syncP2PTracksToAllPeers transceivers configurados en sendrecv');
}

// 2.6 Blindaje de Avatar y Detección de Frames Reales en updateStudentRemotePeerCardMedia (student.html)
const oldStudentUpdateMedia = `      if (vidEl) {
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
        if (phEl) {
          phEl.classList.toggle('hidden', hasLiveVideo);
          phEl.style.display = hasLiveVideo ? 'none' : 'flex';
        }
        if (hasLiveVideo) {
          vidEl.play().catch(() => {});
        }
      }`;

const newStudentUpdateMedia = `      if (vidEl) {
        vidEl.setAttribute('playsinline', '');
        vidEl.setAttribute('webkit-playsinline', '');
        vidEl.setAttribute('autoplay', '');
        if (currentVideoMode === 'p2p' && peerObj.stream && vidEl.srcObject !== peerObj.stream) {
          vidEl.srcObject = peerObj.stream;
          vidEl.muted = false;
        }

        if (!vidEl.__frameDetectionAttached) {
          vidEl.__frameDetectionAttached = true;
          const onFrameReady = () => {
            if (peerObj.videoEnabled && !peerObj.isSharingScreen && vidEl.videoWidth > 0 && !vidEl.paused) {
              vidEl.classList.remove('hidden');
              if (phEl) {
                phEl.classList.add('hidden');
                phEl.style.display = 'none';
              }
            }
          };
          vidEl.addEventListener('loadedmetadata', onFrameReady);
          vidEl.addEventListener('playing', onFrameReady);
          vidEl.addEventListener('timeupdate', onFrameReady);
          vidEl.addEventListener('pause', () => {
            if (vidEl.paused && phEl) {
              vidEl.classList.add('hidden');
              phEl.classList.remove('hidden');
              phEl.style.display = 'flex';
            }
          });
        }

        const hasStreamLiveVideoTrack = peerObj.stream && peerObj.stream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled && !t.muted);
        if (hasStreamLiveVideoTrack) {
          peerObj.videoEnabled = true;
        }
        const hasLiveDecodedFrames = vidEl.videoWidth > 0 && !vidEl.paused && vidEl.readyState >= 2;
        const shouldShowVideo = Boolean(peerObj.videoEnabled) && hasStreamLiveVideoTrack && hasLiveDecodedFrames && !peerObj.isSharingScreen;

        vidEl.classList.toggle('hidden', !shouldShowVideo);
        if (phEl) {
          phEl.classList.toggle('hidden', shouldShowVideo);
          phEl.style.display = shouldShowVideo ? 'none' : 'flex';
        }
        if (peerObj.videoEnabled && hasStreamLiveVideoTrack) {
          vidEl.play().catch(() => {});
        }
      }`;

if (student.includes(oldStudentUpdateMedia)) {
  student = student.replace(oldStudentUpdateMedia, newStudentUpdateMedia);
  console.log('✓ student.html: updateStudentRemotePeerCardMedia blindado contra pantalla negra');
}

// 2.7 Blindaje contra poda prematura en cleanupOrphanStudentVideoCards (student.html)
const oldStudentCleanup = `    function cleanupOrphanStudentVideoCards(activeParticipantKeys) {
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
          if (dKey) {
            if (seenKeys.has(dKey)) {
              cardEl.remove();
              return;
            }
            if (activeParticipantKeys && activeParticipantKeys.size > 0 && !activeParticipantKeys.has(dKey)) {
              cardEl.remove();
              return;
            }
            seenKeys.add(dKey);
          }
        });
      }

      if (typeof updateMinimizedVideoStripSummary === 'function') {
        updateMinimizedVideoStripSummary();
      }
    }`;

const newStudentCleanup = `    function cleanupOrphanStudentVideoCards(activeParticipantKeys) {
      const strip = document.getElementById('webrtcVideoStrip');
      Object.keys(webrtcPeers).forEach(pid => {
        const p = webrtcPeers[pid];
        if (!p) return;
        // Blindaje: El Profesor (Host) NUNCA es huérfano en la pantalla del alumno
        if (p.role === 'host' || pid === 'host_presence' || pid.startsWith('host_') || (p.name && p.name.includes('Profesor'))) {
          return;
        }
        // Blindaje: Proteger conexiones P2P activas, en conexión o con señalización viva
        if (p.pc && (p.pc.connectionState === 'connected' || p.pc.connectionState === 'connecting' || p.pc.signalingState !== 'closed')) {
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
          if (dKey === '__host__') return; // Nunca remover tarjeta del Host
          if (dKey) {
            if (seenKeys.has(dKey)) {
              cardEl.remove();
              return;
            }
            if (activeParticipantKeys && activeParticipantKeys.size > 0 && !activeParticipantKeys.has(dKey)) {
              cardEl.remove();
              return;
            }
            seenKeys.add(dKey);
          }
        });
      }

      if (typeof updateMinimizedVideoStripSummary === 'function') {
        updateMinimizedVideoStripSummary();
      }
      if (typeof syncVideoGalleryMode === 'function') {
        syncVideoGalleryMode();
      }
    }`;

if (student.includes(oldStudentCleanup)) {
  student = student.replace(oldStudentCleanup, newStudentCleanup);
  console.log('✓ student.html: cleanupOrphanStudentVideoCards blindado contra poda del Host y pares');
}

// 2.8 Invocar syncVideoGalleryMode al agregar o remover tarjetas en student.html
const oldEnsureEnd = `        updateMinimizedVideoStripSummary();
        return webrtcPeers[remotePeerId];
      }

      const card = document.createElement('div');`;

const newEnsureEnd = `        updateMinimizedVideoStripSummary();
        if (typeof syncVideoGalleryMode === 'function') syncVideoGalleryMode();
        return webrtcPeers[remotePeerId];
      }

      const card = document.createElement('div');`;

if (student.includes(oldEnsureEnd)) {
  student = student.replace(oldEnsureEnd, newEnsureEnd);
  console.log('✓ student.html: syncVideoGalleryMode enlazado en ensureRemoteVideoCard (rama 1)');
}

const oldEnsureNewCardEnd = `        updateMinimizedVideoStripSummary();
      }

      return card;
    }

    function removeStudentRemoteVideoCard`;

const newEnsureNewCardEnd = `        updateMinimizedVideoStripSummary();
        if (typeof syncVideoGalleryMode === 'function') syncVideoGalleryMode();
      }

      return card;
    }

    function removeStudentRemoteVideoCard`;

if (student.includes(oldEnsureNewCardEnd)) {
  student = student.replace(oldEnsureNewCardEnd, newEnsureNewCardEnd);
  console.log('✓ student.html: syncVideoGalleryMode enlazado en ensureRemoteVideoCard (rama 2)');
}

const oldRemoveCardEnd = `      if (typeof updateMinimizedVideoStripSummary === 'function') {
        updateMinimizedVideoStripSummary();
      }
    }

    function cleanupOrphanStudentVideoCards`;

const newRemoveCardEnd = `      if (typeof updateMinimizedVideoStripSummary === 'function') {
        updateMinimizedVideoStripSummary();
      }
      if (typeof syncVideoGalleryMode === 'function') {
        syncVideoGalleryMode();
      }
    }

    function cleanupOrphanStudentVideoCards`;

if (student.includes(oldRemoveCardEnd)) {
  student = student.replace(oldRemoveCardEnd, newRemoveCardEnd);
  console.log('✓ student.html: syncVideoGalleryMode enlazado en removeStudentRemoteVideoCard');
}

fs.writeFileSync('ELT LIVE WEB/student.html', student, 'utf8');
console.log('✓ ELT LIVE WEB/student.html guardado exitosamente');

// 3. SINCRONIZAR COPIAS IDÉNTICAS HACIA student.html RAÍZ Y ELT LIVE WEB/index.html
fs.writeFileSync('student.html', student, 'utf8');
fs.writeFileSync('ELT LIVE WEB/index.html', student, 'utf8');
console.log('✓ Copias sincronizadas en student.html raíz y ELT LIVE WEB/index.html');

// 4. VERIFICAR SHA-256
const crypto = require('crypto');
function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}
const h1 = hashFile('ELT LIVE WEB/student.html');
const h2 = hashFile('student.html');
const h3 = hashFile('ELT LIVE WEB/index.html');

console.log('SHA-256 ELT LIVE WEB/student.html:', h1);
console.log('SHA-256 student.html:             ', h2);
console.log('SHA-256 ELT LIVE WEB/index.html:   ', h3);

if (h1 === h2 && h2 === h3) {
  console.log('✓ PARIDAD 100% CONFIRMADA EN LOS 3 ARCHIVOS');
} else {
  console.error('! ERROR DE PARIDAD EN HASHES SHA-256');
}
