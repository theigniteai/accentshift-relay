import express from "express";
import dotenv from "dotenv";
import { createServer } from "http";
import { initWebSocket } from "./accentRelay.js";

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 8080;

// Health check route
app.get("/", (req, res) => {
  res.send("🟢 AccentRelay WebSocket Server is running.");
});

// Start server and initialize WebSocket
server.listen(PORT, () => {
  console.log(`✅ HTTP server running on port ${PORT}`);
  initWebSocket(server); // WebSocket kicks in here
});
