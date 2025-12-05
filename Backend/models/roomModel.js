import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  channelName: { type: String, required: true, unique: true },
  hostId: { type: String, required: true },
  pendingRequests: [
    {
      studentId: String,
      studentName: String,
      status: { type: String, default: "pending" }, // pending/approved/rejected
    }
  ]
});

const Room = mongoose.model("Room", roomSchema);
export default Room;
