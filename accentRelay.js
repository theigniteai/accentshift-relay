// accentRelay.js - FIXED: Real-Time Voice Accent Changer with ElevenLabs

import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import axios from "axios";
import { Readable } from "stream";

dotenv.config();

export function initWebSocket(server) {
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  const VOICE_IDS = {
    us: "EXAVITQu4vr4xnSDxMaL",
    uk: "TxGEqnHWrfWFTfGW9XjX",
    aus: "ErXwobaYiN019PkySvjV"
  };

  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("🔗 Client connected to AccentRelay");

    let accent = "us";

    ws.on("message", async (message, isBinary) => {
      if (!isBinary) {
        try {
          const msg = JSON.parse(message.toString());
          if (msg.type === "start") {
            accent = msg.accent || "us";
            console.log("Accent set to:", accent);
            return;
          }
          if (msg.type === "stop") {
            console.log("🛑 Client stopped");
            return;
          }
        } catch (err) {
          console.error("❌ JSON parsing error:", err.message);
          return;
        }
      }

      // 🔁 Simulated streaming (real mic data would need transcription)
      const text = "This is your real-time AI accent relay speaking.";

      try {
        const response = await axios({
          method: "POST",
          url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_IDS[accent]}/stream`,
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json"
          },
          data: {
            text,
            voice_settings: {
              stability: 0.4,
              similarity_boost: 0.75
            }
          },
          responseType: "stream"
        });

        response.data.on("data", (chunk) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(chunk);
          }
        });

        response.data.on("end", () => {
          console.log("✅ Streaming finished");
        });
      } catch (err) {
        console.error("❌ ElevenLabs error:", err.response?.data || err.message);
        if (ws.readyState === ws.OPEN) {
          ws.send("Error: " + err.message);
        }
      }
    });

    ws.on("close", () => {
      console.log("❌ Client disconnected from AccentRelay");
    });
  });
}
