import express from "express";
import { Server } from "socket.io";
import http from "http";
import { config } from "dotenv";
import {
  userJoin,
  getUserFromPeer,
  getUserFromSocket,
  getRoomUsers,
} from "./utils/users.js";
config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set("view engine", "pug");

app.get("/", (req, res) => {
  res.render("index");
});

io.on("connection", (socket) => {
  console.log(`new socket connection with socket id: ${socket.id}`);

  //Join a room
  socket.on("join-room", (peerId, roomName) => {
    const rooms = io.sockets.adapter.rooms;
    const room = rooms.get(roomName);
    if (room === undefined || room.size < 20) {
      socket.join(roomName);
      userJoin(socket.id, peerId, roomName);
      socket.broadcast.to(roomName).emit("new-user-connected", peerId);
    } else {
      socket.emit("room-full");
    }
    //TODO: Move disconnect to it's proper place in the socket connection flow.
    socket.on("disconnect", () => {
      console.log("disconnecting " + peerId);
      socket.broadcast.to(roomName).emit("user-disconnected", peerId);
    });
  });
  socket.on("toggle-user-audio", (peerId) => {
    const user = getUserFromPeer(peerId);
    console.log("toggle audio caught with ", user);
    if (user) io.to(user.socketId).emit("admin-audio-toggle");
  });
  socket.on("toggle-user-video", (peerId) => {
    const user = getUserFromPeer(peerId);
    if (user) io.to(user.socketId).emit("admin-video-toggle");
  });
});

const port = process.env.PORT || 3000;

app.use(express.static("public"));

server.listen(port, () => {
  console.log(`HTTP server started and listening on port ${port}.`);
});
