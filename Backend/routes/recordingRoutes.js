import express from "express";

const recordingRoute = express.Router()

import { startAgoraRecording , stopAgoraRecording } from "../controllers/classRoomController.js";

recordingRoute.post("/start", startAgoraRecording);

recordingRoute.post("/stop", stopAgoraRecording);

export default recordingRoute