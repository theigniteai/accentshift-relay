import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { initWebSocket } from "./accentRelay.js";

dotenv.config();

const app = express();
const server = createServer(app);

app.get("/", (req, res) => {
  res.send("🟢 AccentRelay WebSocket Server Running");
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  initWebSocket(server);
});
