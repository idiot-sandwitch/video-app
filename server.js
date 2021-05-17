import express from "express";
import { Server } from "socket.io";
import http from "http";
import { config } from "dotenv";
config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('view engine', 'pug')

app.get('/', (req, res) => {
  res.render('index')
})

io.on("connection", (socket) => {
  console.log(`new socket connection with socket id: ${socket.id}`);

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

const port = process.env.PORT || 3000;

app.use(express.static("public"));

server.listen(port, () => {
  console.log(`HTTP server started and listening on port ${port}.`);
});
