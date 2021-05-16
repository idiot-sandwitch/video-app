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
  console.log("New Connection");
});

const pathToPublic = path.join(__dirname, "../public");

const port = process.env.PORT || 3000;

app.use(express.static(pathToPublic));

server.listen(port, () => {
  console.log(`Listening to ${port}`);
});
