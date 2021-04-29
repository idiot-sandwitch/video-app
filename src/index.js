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
  socket.on("join", (roomName) => {
    const rooms = io.sockets.adapter.rooms;
    const room = rooms.get(roomName);

    //isNew indicates whether a new room is being created by the user who emitted the join request.
    const isNew = room === undefined ? true : false;

    if (room === undefined || room.size === 1) {
      socket.join(roomName);
      socket.emit("room-joined", isNew);
    } else {
      socket.emit(`room-full`);
    }

    console.log(rooms);
  });

  //Indicates that current user is ready with their media and broadcasts this to the other user in the room, if available.
  socket.on("ready", (roomName) => {
    console.log(`server caught ready broadcasted by ${socket.id}`);
    socket.broadcast.to(roomName).emit("ready");
  });

  socket.on("candidate", (candidate, roomName) => {
    console.log(`New candidate request by ${socket.id}: `, candidate);
    socket.broadcast.to(roomName).emit("candidate", candidate);
  });

  //When ice candidate is ready, the offer and answer exchange establishes the actual p2p connection between the clients.
  socket.on("offer", (offer, roomName) => {
    socket.broadcast.to(roomName).emit("offer", offer);
  });

  socket.on("answer", (answer, roomName) => {
    socket.broadcast.to(roomName).emit("answer", answer);
  });
});

const pathToPublic = path.join(__dirname, "../public");

const port = process.env.PORT || 3000;

app.use(express.static(pathToPublic));

server.listen(port, () => {
  console.log(`Listening to ${port}`);
});
