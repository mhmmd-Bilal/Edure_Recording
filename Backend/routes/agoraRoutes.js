import express from "express";
import { agoraTokenCreate } from "../controllers/classRoomController.js";

const agoraRoutes = express.Router();

// generate a token for a channel (roomId) and uid
agoraRoutes.post("/token",agoraTokenCreate);

export default agoraRoutes;
