const express = require("express");
const path = require("path");
const socketio = require("socket.io");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

io.on("connection", (socket) => {
  console.log("New Connection");

  //on join the chat
  

});

const pathToPublic = path.join(__dirname, "../public");

const port = process.env.PORT || 3000;

app.use(express.static(pathToPublic));

server.listen(3000, () => {
  console.log(`Listening to ${port}`);
});
