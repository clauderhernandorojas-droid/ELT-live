const fs = require('fs');
const path = require('path');

const hostPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/host.html');
const studentPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/ELT LIVE WEB/student.html');
const indexPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/ELT LIVE WEB/index.html');
const rootStudentPath = path.resolve('c:/Users/User/Documents/ANTIGRAVITY PROJECTS/ELT LIVE/student.html');

console.log('Reading files...');
let hostContent = fs.readFileSync(hostPath, 'utf8');
let studentContent = fs.readFileSync(studentPath, 'utf8');

const hostHadCRLF = hostContent.includes('\r\n');
const studentHadCRLF = studentContent.includes('\r\n');
hostContent = hostContent.replace(/\r\n/g, '\n');
studentContent = studentContent.replace(/\r\n/g, '\n');

// 1. host.html: ensureRemotePeerCard no-op when in jitsi mode
hostContent = hostContent.replace(
  "    function ensureRemotePeerCard(peerId, peerName) {\n      if (!webrtcRemoteCardsContainer || !peerId) return null;",
  "    function ensureRemotePeerCard(peerId, peerName) {\n      if (!webrtcRemoteCardsContainer || !peerId) return null;\n      if (currentVideoMode === 'jitsi') return null;"
);

// 2. student.html: startStudentVideoEngine hide any existing cards when switching to jitsi
const studentStartTarget = `        if (jitsiContainer) {
          jitsiContainer.classList.remove('hidden');
          const jRoom = currentJitsiRoomName || ('ELTLive_' + (currentRoomPin || '0000') + '_session');
          await mountJitsiMeet(jitsiContainer, jRoom, myName || 'Alumno', currentJitsiDomain || 'meet.jit.si');
        }`;

const studentStartReplacement = `        const expandedBody = document.getElementById('webrtcStripExpandedBody');
        if (expandedBody) {
          expandedBody.querySelectorAll('[data-peer-id], [data-student-name]').forEach(c => c.classList.add('hidden'));
        }

        if (jitsiContainer) {
          jitsiContainer.classList.remove('hidden');
          const jRoom = currentJitsiRoomName || ('ELTLive_' + (currentRoomPin || '0000') + '_session');
          await mountJitsiMeet(jitsiContainer, jRoom, myName || 'Alumno', currentJitsiDomain || 'meet.jit.si');
        }`;

if (studentContent.includes(studentStartTarget)) {
  studentContent = studentContent.replace(studentStartTarget, studentStartReplacement);
}

// 3. student.html: when switching to livekit, unhide remote cards
const studentLKStartTarget = `        if (localCard) localCard.classList.remove('hidden');
        if (remoteCards) remoteCards.classList.remove('hidden');`;

const studentLKStartReplacement = `        if (localCard) localCard.classList.remove('hidden');
        if (remoteCards) remoteCards.classList.remove('hidden');
        const expandedBodyLK = document.getElementById('webrtcStripExpandedBody');
        if (expandedBodyLK) {
          expandedBodyLK.querySelectorAll('[data-peer-id], [data-student-name]').forEach(c => c.classList.remove('hidden'));
        }`;

if (studentContent.includes(studentLKStartTarget)) {
  studentContent = studentContent.replace(studentLKStartTarget, studentLKStartReplacement);
}

// Ensure no remaining meet.ffmuc.net in either file
hostContent = hostContent.replace(/meet\.ffmuc\.net/g, 'meet.jit.si');
studentContent = studentContent.replace(/meet\.ffmuc\.net/g, 'meet.jit.si');

// Restore line endings
if (hostHadCRLF) hostContent = hostContent.replace(/\n/g, '\r\n');
if (studentHadCRLF) studentContent = studentContent.replace(/\n/g, '\r\n');

// Write files
fs.writeFileSync(hostPath, hostContent, 'utf8');
fs.writeFileSync(studentPath, studentContent, 'utf8');
fs.writeFileSync(indexPath, studentContent, 'utf8');
fs.writeFileSync(rootStudentPath, studentContent, 'utf8');

console.log('Final refinement applied and synchronized across all student paths!');

