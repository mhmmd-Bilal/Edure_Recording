import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema({
  studentId: { type: String },
  name: { type: String, default: "Student" },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  requestedAt: { type: Date, default: Date.now },
});

const ClassSchema = new mongoose.Schema({
  tutorId: { type: String },
  roomId: { type: String, required: true, unique: true },
  title: { type: String, default: "Live Class" },
  createdAt: { type: Date, default: Date.now },
  students: [StudentSchema],
  recording: { type: String },
});

export default mongoose.model("Class", ClassSchema);