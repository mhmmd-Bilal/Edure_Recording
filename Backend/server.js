import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import classRoutes from "./routes/classRoutes.js";
import cors from 'cors'

// Agora token imports
import pkg from "agora-access-token";
const { RtcTokenBuilder, RtcRole } = pkg;

// Load environment variables
dotenv.config();

const app = express();

// Middleware to parse JSON
app.use(express.json());
app.use(cors())

// Connect to MongoDB
connectDb();

const PORT = process.env.PORT || 4000;

// ------------------------------
// 👉 AGORA TOKEN API
// ------------------------------

app.post("/api/agora/token", (req, res) => {
  try {
    const { channelName, uid, role } = req.body;

    if (!channelName || !uid) {
      return res.status(400).json({
        success: false,
        message: "channelName and uid are required",
      });
    }

    const appID = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appID || !appCertificate) {
      return res.status(500).json({
        success: false,
        message: "Agora credentials missing in .env",
      });
    }

    // Role: host or audience
    const userRole =
      role === "host" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    // Token expiry
    const expireTime = 60 * 60 * 24; // 24 hours
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTime;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appID,
      appCertificate,
      channelName,
      uid,
      userRole,
      privilegeExpireTime
    );

    return res.json({
      success: true,
      token,
    });
  } catch (error) {
    console.log("Agora Token Error:", error);
    res.status(500).json({ success: false, message: "Token error" });
  }
});

// ------------------------------
// Existing Routes
// ------------------------------
// app.use("/api/whiteboard", classRoutes);

// ------------------------------
// Start Server
// ------------------------------
app.listen(PORT, () => console.log(`Server Started on ${PORT}`));
