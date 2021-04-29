const express = require("express");
const path = require("path");
const socketio = require("socket.io");
const http = require("http");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketio(server);

io.on("connection", (socket) => {
  console.log("New Connection");
});

const pathToPublic = path.join(__dirname, "../public");

const port = process.env.PORT || 3000;

app.use(express.static(pathToPublic));

server.listen(port, () => {
  console.log(`Listening to ${port}`);
});
