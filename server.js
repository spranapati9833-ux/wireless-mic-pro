const express = require("express");
const http = require("http");
const path = require("path");
const crypto = require("crypto");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(express.static(__dirname));

const sha = s => crypto.createHash("sha256").update(String(s)).digest("hex");
const MASTER_PHONE_HASH = "dd1152f79701d48969c08e4f4ab4c05d036f72f1c2588f02287861e95d0d28e4";
const MASTER_PASS_HASH = "7e1db8744cadba6e4256ef9b8dcef00e36d80b118fc89d5e760d9630245bcda1";

app.post("/api/master-login", (req,res) => {
  const { phone, password } = req.body || {};
  res.json({ ok: sha(phone) === MASTER_PHONE_HASH && sha(password) === MASTER_PASS_HASH });
});

app.get("/", (req,res)=>res.sendFile(path.join(__dirname,"index.html")));
app.get("/health", (_,res)=>res.send("OK"));

const rooms = new Map();
function makeCode() {
  let code;
  do code = String(Math.floor(100000 + Math.random()*900000)); while (rooms.has(code));
  return code;
}

io.on("connection", socket => {
  socket.on("master-create", () => {
    const code = makeCode();
    rooms.set(code, { master: socket.id, mic: null });
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.role = "master";
    socket.emit("master-created", { code });
  });

  socket.on("mic-join", ({code}={}) => {
    code = String(code || "");
    const room = rooms.get(code);
    if (!room || !io.sockets.sockets.get(room.master)) {
      return socket.emit("join-failed", { message: "Room code not found." });
    }
    room.mic = socket.id;
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.role = "mic";
    socket.emit("mic-joined");
    io.to(room.master).emit("mic-connected");
  });

  for (const ev of ["webrtc-offer","webrtc-answer","ice-candidate","mic-control"]) {
    socket.on(ev, data => {
      const code = socket.data.roomCode;
      if (code) socket.to(code).emit(ev, data);
    });
  }

  socket.on("disconnect", () => {
    const code = socket.data.roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (socket.data.role === "master") {
      socket.to(code).emit("master-disconnected");
      rooms.delete(code);
    } else if (room) {
      room.mic = null;
      socket.to(code).emit("mic-disconnected");
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => console.log("Wireless Mic server on", PORT));
