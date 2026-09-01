const express = require("express");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  transports: ["websocket", "polling"]
});

app.use(express.json());
app.use(express.static(__dirname));

const sha256 = (v) => crypto.createHash("sha256").update(String(v ?? "")).digest("hex");
const MASTER_PHONE_HASH = "dd1152f79701d48969c08e4f4ab4c05d036f72f1c2588f02287861e95d0d28e4";
const MASTER_PASS_HASH = "7e1db8744cadba6e4256ef9b8dcef00e36d80b118fc89d5e760d9630245bcda1";

app.post("/api/master-login", (req, res) => {
  const { phone, password } = req.body || {};
  const ok = sha256(phone) === MASTER_PHONE_HASH && sha256(password) === MASTER_PASS_HASH;
  res.json({ ok });
});

app.get("/api/youtube-search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) return res.status(400).json({ error: "Search text required" });
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) return res.status(503).json({ error: "YouTube search key not configured. URL/Video ID playback still works." });
    const url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=" +
      encodeURIComponent(q) + "&key=" + encodeURIComponent(key);
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || "YouTube search failed" });
    const items = (data.items || []).map(x => ({
      id: x.id.videoId,
      title: x.snippet.title,
      channel: x.snippet.channelTitle,
      thumb: x.snippet.thumbnails?.medium?.url || x.snippet.thumbnails?.default?.url || ""
    }));
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: "YouTube search error" });
  }
});

app.get("/", (req,res) => res.sendFile(path.join(__dirname,"index.html")));
app.get("/health", (_,res) => res.send("OK"));

const rooms = new Map();

function makeCode() {
  let code;
  do code = String(Math.floor(100000 + Math.random() * 900000));
  while (rooms.has(code));
  return code;
}

io.on("connection", (socket) => {
  socket.on("master-create", () => {
    if (socket.data.roomCode && rooms.get(socket.data.roomCode)?.master === socket.id) {
      rooms.delete(socket.data.roomCode);
    }
    const code = makeCode();
    rooms.set(code, { master: socket.id, mic: null });
    socket.join(code);
    socket.data.role = "master";
    socket.data.roomCode = code;
    socket.emit("master-created", { code });
  });

  socket.on("mic-join", (payload={}) => {
    const code = String(payload.code || "").trim();
    const room = rooms.get(code);
    if (!room || !io.sockets.sockets.get(room.master)) {
      return socket.emit("join-failed", { message: "Room code not found." });
    }
    if (room.mic && room.mic !== socket.id && io.sockets.sockets.get(room.mic)) {
      return socket.emit("join-failed", { message: "This room already has a Mic Phone connected." });
    }
    room.mic = socket.id;
    socket.join(code);
    socket.data.role = "mic";
    socket.data.roomCode = code;
    socket.emit("mic-joined", { code });
    io.to(room.master).emit("mic-connected");
  });

  ["webrtc-offer","webrtc-answer","ice-candidate","mic-control"].forEach(ev => {
    socket.on(ev, data => {
      const code = socket.data.roomCode;
      if (code) socket.to(code).emit(ev, data);
    });
  });

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (socket.data.role === "master") {
      socket.to(code).emit("master-disconnected");
      rooms.delete(code);
    } else if (room && room.mic === socket.id) {
      room.mic = null;
      socket.to(code).emit("mic-disconnected");
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => console.log("Wireless Mic Pro running on", PORT));
