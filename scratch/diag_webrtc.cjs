const fs = require('fs');

const hostHtml = fs.readFileSync('host.html', 'utf8');
const studentHtml = fs.readFileSync('ELT LIVE WEB/student.html', 'utf8');

console.log('Host length:', hostHtml.length);
console.log('Student length:', studentHtml.length);

// 1. Search in host.html for WebRTC setup, peer connection, track additions, replaceTrack, negotiation
function searchPatterns(fileStr, name, patterns) {
  console.log(`\n=================== ${name} ===================`);
  patterns.forEach(pat => {
    let re = new RegExp(pat, 'gi');
    let m;
    let count = 0;
    while ((m = re.exec(fileStr)) !== null && count < 5) {
      count++;
      console.log(`[${pat}] at index ${m.index}:`);
      console.log(fileStr.slice(Math.max(0, m.index - 80), Math.min(fileStr.length, m.index + 250)));
      console.log('---------------------------------');
    }
    if (count === 0) console.log(`[${pat}] NOT FOUND`);
  });
}

searchPatterns(hostHtml, 'HOST.HTML', [
  'WEBRTC_OFFER',
  'WEBRTC_ANSWER',
  'WEBRTC_ICE',
  'WEBRTC_ANNOUNCE',
  'replaceTrack',
  'addTrack',
  'getOrCreateP2PPeerConnection',
  'ensureRemoteVideoCard',
  'cleanupOrphanStudentVideoCards',
  'scale-x'
]);

searchPatterns(studentHtml, 'STUDENT.HTML', [
  'WEBRTC_OFFER',
  'WEBRTC_ANSWER',
  'WEBRTC_ICE',
  'WEBRTC_ANNOUNCE',
  'replaceTrack',
  'addTrack',
  'getOrCreateP2PPeerConnection',
  'ensureRemoteVideoCard',
  'webrtcLocalVideo',
  'scale-x'
]);
