import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRequestJoinMutation } from "../slices/roomApiSlice";

function StudentJoinPage() {
  const [classCode, setClassCode] = useState("");

  const [requestJoin] = useRequestJoinMutation();

  const navigate = useNavigate();

  const sendRequest = async (e) => {
    e.preventDefault();
    try {
      let res = await requestJoin({
        roomId: classCode,
        studentId: "STDNT0001",
        name: "sam",
      });
      localStorage.setItem("classCode", classCode);
      localStorage.setItem("role", "student");

      navigate(`/class/${classCode}`);
    } catch (error) {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white shadow-lg rounded-2xl p-6 w-full max-w-sm">
        <h1 className="text-xl font-semibold mb-4 text-center">
          Enter Class Code
        </h1>

        <form onSubmit={sendRequest} className="space-y-4">
          <input
            type="text"
            placeholder="Enter class code"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value)}
            className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition"
          >
            Send Request
          </button>
        </form>
      </div>
    </div>
  );
}

export default StudentJoinPage;
