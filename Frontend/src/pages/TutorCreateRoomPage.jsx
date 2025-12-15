import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useCreateClassMutation,
  useGenerateRoomTokenMutation,
  useRequestJoinMutation,
} from "../slices/roomApiSlice";

export default function TutorCreateRoomPage() {
  const [title, setTitle] = useState("");

  const navigate = useNavigate();

  const [createClassApi] = useCreateClassMutation();

  const createRoom = async () => {
    if (!title.trim()) return alert("Enter class title");
    try {
      // 1️⃣ Create Room in DB
      const res = await createClassApi({
        tutorId: "TUTOR0001",
        title,
      }).unwrap();
      const room = res.class;

      localStorage.setItem("classDetails", JSON.stringify(room));
      localStorage.setItem("className", title);
      localStorage.setItem("role", "host");

      // 3️⃣ Redirect to ClassRoomPage with roomId + token + uid
      navigate(`/class/${room.roomId}`);
    } catch (err) {
      console.error("Error creating room:", err);
      alert("Failed to create room");
    }
  };



  return (
    <>
        <div className="p-6 min-h-screen bg-gradient-to-br from-[#071028] to-[#0b1630] text-white flex flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">Create Class</h1>
          <input
            type="text"
            placeholder="Class Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full max-w-md p-3 rounded bg-black/60"
          />
          <button
            onClick={createRoom}
            className="w-full max-w-md bg-blue-600 p-3 rounded font-semibold"
          >
            Create Room
          </button>
        </div>
    </>
  );
}
