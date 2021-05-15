import express from "express";
import path, { dirname } from "path";
import { Server } from "socket.io";
import http from "http";
import { fileURLToPath } from "url";
import { config } from "dotenv";
config();

//__dirname is declared because of modular import definitions.
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on("connection", (socket) => {
  console.log(`new connection: id=${socket.id}`);

  //Join a room
  socket.on("join-room", (userId, roomName) => {
    const rooms = io.sockets.adapter.rooms;
    const room = rooms.get(roomName);
    if (room === undefined || room.size < 20) {
      socket.join(roomName);
      socket.broadcast.to(roomName).emit("new-user-connected", userId);
    } else {
      socket.emit("room-full");
    }
    socket.on("disconnect", () => {
      console.log("disconnecting " + userId);
      socket.broadcast.to(roomName).emit("user-disconnected", userId);
    });
  });
});

const pathToPublic = path.join(__dirname, "../public");

const port = process.env.PORT || 3000;

app.use(express.static(pathToPublic));

server.listen(port, () => {
  console.log(`Listening to ${port}`);
});
