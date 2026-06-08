const express = require("express");
const cors = require("cors");
const db = require("./lib/db");


const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 4000;
const authRoutes = require("./routes/auth_routes");


const server = http.createServer(app);


const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use("/api/auth_routes", authRoutes);

app.get("/", (req, res) => {
    res.send("App is running with Socket.io!")
});


io.on("connection", (socket) => {
  console.log(`User connected to WebSocket: ${socket.id}`);


  socket.on("join_room", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their private room.`);
  });


  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});


server.listen(PORT, () => {
    console.log(`App is listening on port http://127.0.0.1:${PORT}`)
});