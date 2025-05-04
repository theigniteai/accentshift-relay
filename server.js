require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', function connection(ws) {
  console.log('🎤 New client connected');

  let audioBuffer = [];

  ws.on('message', async function incoming(message) {
    if (Buffer.isBuffer(message)) {
      audioBuffer.push(message);
    } else {
      console.log("Non-binary message received");
    }
  });

  ws.on('close', async () => {
    console.log('📴 Client disconnected');

    // Combine audio buffer
    const fullBuffer = Buffer.concat(audioBuffer);
    fs.writeFileSync('temp_audio.webm', fullBuffer);

    try {
      // Transcribe with Whisper
      const whisperResp = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        fs.createReadStream('temp_audio.webm'),
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      const text = whisperResp.data.text;

      // Convert to accent using ElevenLabs
      const ttsResp = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`,
        { text },
        {
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer'
        }
      );

      fs.writeFileSync('output.mp3', ttsResp.data);
      console.log("✅ Accent conversion complete (output.mp3 ready)");
    } catch (err) {
      console.error("❌ Error during conversion:", err.message);
    }

    // Cleanup
    fs.unlinkSync('temp_audio.webm');
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log('🟢 AccentShift Relay Server running on port 3000');
});