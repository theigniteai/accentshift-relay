require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

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

    const fullBuffer = Buffer.concat(audioBuffer);
    const tempPath = path.join(__dirname, 'temp_audio.webm');
    fs.writeFileSync(tempPath, fullBuffer);

    try {
      // Prepare form data for Whisper transcription
      const formData = new FormData();
      formData.append('file', fs.createReadStream(tempPath));
      formData.append('model', 'whisper-1');

      const whisperResp = await axios.post(
        'https://api.openai.com/v1/audio/transcriptions',
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
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

      const outputPath = path.join(__dirname, 'output.mp3');
      fs.writeFileSync(outputPath, ttsResp.data);
      console.log("✅ Accent conversion complete: /output");

    } catch (err) {
      console.error("❌ Error during conversion:", err.message);
    }

    fs.unlink(tempPath, (err) => {
      if (err) console.error("Failed to delete temp file:", err.message);
    });
  });
});

// Public route to access the final output audio
app.get('/output', (req, res) => {
  const filePath = path.join(__dirname, 'output.mp3');
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.sendFile(filePath);
  } else {
    res.status(404).send('No output file found');
  }
});

server.listen(process.env.PORT || 3000, () => {
  console.log('🟢 AccentShift Relay Server running on port 3000');
});
