import expressAsyncHandler from "express-async-handler";
import axios from "axios";





const createClass = expressAsyncHandler(async (req, res) => {
  try {

  } catch (err) {
    console.error("Room creation error:", err.response?.data || err.message);
    res.status(500).json({ error: "Room creation failed" });
  }
});

export { createClass };