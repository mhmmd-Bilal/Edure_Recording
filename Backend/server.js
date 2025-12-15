import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db.js";


import classRoutes from "./routes/classRoutes.js";
import agoraRoutes from "./routes/agoraRoutes.js";
import recordingRoute from "./routes/recordingRoutes.js";


import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, { cors: { origin: "*" }});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join-socket-room", ({ roomId }) => {
    socket.join(roomId);
  });

  socket.on("request-join", ({ roomId, student }) => {
    io.to(roomId).emit("incoming-request", { roomId, student });
  });

  socket.on("approve-student", ({ roomId, studentId }) => {
    io.to(roomId).emit("request-approved", { roomId, studentId });
  });

  socket.on("user-left", ({ roomId, uid }) => {
    io.to(roomId).emit("remote-user-left", { uid });
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});

app.use(express.json());
app.use(cors());

connectDb();

app.use("/api/agora", agoraRoutes);
app.use("/api/class", classRoutes);
app.use('/api/recording',recordingRoute)

server.listen(process.env.PORT || 4000, () =>
  console.log(`Server running`)
);
