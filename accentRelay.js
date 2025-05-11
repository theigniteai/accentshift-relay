import { WebSocketServer } from 'ws';
import { Readable } from 'stream';
import { ElevenLabsClient } from 'elevenlabs';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const elevenlabs = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export function initWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (socket) => {
    console.log('🔌 WebSocket connected');

    let audioChunks = [];
    let selectedAccent = 'us';

    socket.on('message', async (message) => {
      if (typeof message === 'string') {
        try {
          const parsed = JSON.parse(message);
          if (parsed.type === 'start') {
            selectedAccent = parsed.accent || 'us';
            console.log('🟣 Selected Accent:', selectedAccent);
          }
        } catch (err) {
          if (message === 'stop') {
            console.log('🛑 Received stop signal');

            const audioBuffer = Buffer.concat(audioChunks);
            const audioStream = Readable.from(audioBuffer);

            try {
              const transcript = await openai.audio.transcriptions.create({
                file: audioStream,
                model: "whisper-1"
              });

              const text = transcript.text;
              console.log("📝 Transcribed Text:", text);

              const tts = await elevenlabs.textToSpeech.convert({
                voiceId: voiceMap[selectedAccent] || voiceMap["us"],
                text
              });

              const audio = Buffer.from(await tts.arrayBuffer());
              console.log("✅ Sending audio buffer of size:", audio.length);

              socket.send(audio);
            } catch (error) {
              console.error('❌ Error during processing:', error.message);
              socket.send("ERROR: " + error.message);
            }

            audioChunks = [];
          }
        }
      } else {
        audioChunks.push(message);
      }
    });

    socket.on('close', () => console.log('❌ WebSocket closed'));
  });
}

const voiceMap = {
  us: "EXAVITQu4vr4xnSDxMaL",
  uk: "TxGEqnHWrfWFTfGW9XjX",
  aus: "ErXwobaYiN019PkySvjV",
  in: "MF3mGyEYCl7XYWbV9V6O"
};
