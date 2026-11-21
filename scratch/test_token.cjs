const fs = require('fs');

const content = fs.readFileSync('host.html', 'utf8');
const keyMatch = content.match(/const SUPABASE_ANON_KEY = ["']([^"']+)["']/);
const SUPABASE_ANON_KEY = keyMatch ? keyMatch[1] : '';
const SUPABASE_URL = 'https://pctvqffjpyiamlfprome.supabase.co';

async function testToken() {
  try {
    const res = await fetch(SUPABASE_URL + '/functions/v1/livekit-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ roomName: '7328', participantName: 'Andrea', isHost: false })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('url:', data.url);
    if (data.token) {
      const payload = JSON.parse(Buffer.from(data.token.split('.')[1], 'base64').toString());
      console.log('Token JWT Payload:', JSON.stringify(payload, null, 2));
    } else {
      console.log('Error data:', data);
    }
  } catch (err) {
    console.error(err);
  }
}
testToken();
