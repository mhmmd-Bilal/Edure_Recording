import Class from "../models/roomModel.js";
import { nanoid } from "nanoid";
import pkg from "agora-access-token";
const { RtcTokenBuilder, RtcRole } = pkg;
import axios from "axios";

// create a new class (tutor)
const createClass = async (req, res) => {
  try {
    const { tutorId, title } = req.body;
    const roomId = nanoid(10);
    const c = await Class.create({ tutorId, title, roomId });
    res.json({ class: c });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// request to join (student)
const sendRequest = async (req, res) => {
  try {
    const { roomId, studentId, name } = req.body;
    const c = await Class.findOne({ roomId });
    if (!c)
      return res.status(404).json({ success: false, error: "Room not found" });

    // if already requested, return
    const exist = c.students.find((s) => s.studentId === studentId);
    if (exist)
      return res.json({
        success: true,
        message: "Already requested",
        student: exist,
      });

    const student = { studentId, name };
    c.students.push(student);
    await c.save();

    // notify via socket if server will emit
    req.app.get("io")?.to(roomId)?.emit("join-request", { roomId, student });
    return res.json({ success: true, student });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// approve student
const approveStudent = async (req, res) => {
  try {
    const { roomId, studentId } = req.body;
    const c = await Class.findOne({ roomId });
    if (!c)
      return res.status(404).json({ success: false, error: "Room not found" });

    const s = c.students.find((st) => st.studentId === studentId);
    if (!s)
      return res
        .status(404)
        .json({ success: false, error: "Student not found" });

    s.status = "approved";
    await c.save();

    // notify student(s) via socket room
    req.app
      .get("io")
      ?.to(roomId)
      ?.emit("request-approved", { roomId, studentId });

    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// check if student approved
const studentApprovelCheck = async (req, res) => {
  try {
    const { roomId, studentId } = req.params;
    const c = await Class.findOne({ roomId });
    if (!c) return res.json({ allowed: false });
    const s = c.students.find((st) => st.studentId === studentId);
    return res.json({ allowed: !!s && s.status === "approved" });
  } catch (e) {
    res.json({ allowed: false });
  }
};

const agoraTokenCreate = async (req, res) => {
  const appId = process.env.AGORA_APP_ID;
  const appCert = process.env.AGORA_APP_CERTIFICATE;
  const { classCode, uid, role } = req.body;

  if (!appId || !appCert)
    return res.status(500).json({ error: "Agora not configured" });

  const expirationInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationInSeconds;

  // use role properly
  const rtcRole = role === "host" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCert,
      classCode,
      uid || 0, // uid must be number
      rtcRole,
      privilegeExpiredTs
    );
    res.json({ token, uid });
  } catch (e) {
    console.error("Agora Token Error:", e.message);
    res.status(500).json({ error: e.message });
  }
};

// Generate Agora RESTful API Authorization
// const getAgoraAuthHeader = () => {
//   const cid = process.env.AGORA_CUSTOMER_ID;
//   const secret = process.env.AGORA_CUSTOMER_SECRET;

//   const base64 = Buffer.from(`${cid}:${secret}`).toString("base64");

//   return {
//     Authorization: `Basic ${base64}`,
//     "Content-Type": "application/json",
//   };
// };

const startAgoraRecording = async (req, res) => {
  try {
    const { channelName } = req.body;

    const RECORDER_UID = "1001";

    // 1. Acquire
    const acquire = await axios.post(
      `https://api.agora.io/v1/apps/${process.env.AGORA_APP_ID}/cloud_recording/acquire`,
      {
        cname: channelName,
        uid: RECORDER_UID,
        clientRequest: {}
      },
      {
        auth: {
          username: process.env.AGORA_CUSTOMER_ID,
          password: process.env.AGORA_CUSTOMER_SECRET
        }
      }
    );

    const resourceId = acquire.data.resourceId;

    // 2. Start
    const start = await axios.post(
      `https://api.agora.io/v1/apps/${process.env.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
      {
        cname: channelName,
        uid: RECORDER_UID,
        clientRequest: {
          recordingConfig: {
            maxIdleTime: 30,
            streamTypes: 2,
            channelType: 1,
            videoStreamType: 0,
            transcodingConfig: {
              width: 1280,
              height: 720,
              fps: 15,
              bitrate: 800
            }
          },
          storageConfig: {
            vendor: 1,
            region: Number(process.env.AWS_REGION_CODE),
            bucket: process.env.AWS_BUCKET,
            accessKey: process.env.AWS_KEY,
            secretKey: process.env.AWS_SECRET,
            fileNamePrefix: ["recordings"]
          }
        }
      },
      {
        auth: {
          username: process.env.AGORA_CUSTOMER_ID,
          password: process.env.AGORA_CUSTOMER_SECRET
        }
      }
    );

    res.json({
      resourceId,
      sid: start.data.sid
    });
  } catch (err) {
    console.log("START ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to start recording" });
  }
};


const stopAgoraRecording = async (req, res) => {
  try {
    const { resourceId, sid, channelName } = req.body;

    const RECORDER_UID = "1001";

    // 1. Stop Request
    const stop = await axios.post(
      `https://api.agora.io/v1/apps/${process.env.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
      {
        cname: channelName,
        uid: RECORDER_UID,
        clientRequest: {}
      },
      {
        auth: {
          username: process.env.AGORA_CUSTOMER_ID,
          password: process.env.AGORA_CUSTOMER_SECRET
        }
      }
    );

    let files = stop.data?.serverResponse?.fileList;

    // ⏳ Retry if file is not yet generated
    if (!files || files.length === 0) {
      console.log("No data yet. Retrying...");

      await new Promise((r) => setTimeout(r, 3000)); // wait 3 seconds

      const query = await axios.get(
        `https://api.agora.io/v1/apps/${process.env.AGORA_APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/query`,
        {
          auth: {
            username: process.env.AGORA_CUSTOMER_ID,
            password: process.env.AGORA_CUSTOMER_SECRET
          }
        }
      );

      files = query.data?.serverResponse?.fileList || [];
    }

    if (!files || files.length === 0) {
      return res.json({ message: "No recorded data" });
    }

    // console.log(files)
    const filePath = files;

    const recordingUrl = `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${filePath}`;

    // Save to DB
    await Class.findOneAndUpdate(
      { roomId: channelName },
      { recording: recordingUrl },
      { new: true }
    );

    res.json({ recordingUrl });
  } catch (err) {
    console.log("STOP ERROR:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to stop recording" });
  }
};


export {
  createClass,
  sendRequest,
  approveStudent,
  studentApprovelCheck,
  agoraTokenCreate,
  startAgoraRecording,
  stopAgoraRecording,
};
