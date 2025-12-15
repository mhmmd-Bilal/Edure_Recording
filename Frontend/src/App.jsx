import { Routes, Route } from "react-router-dom";
import TutorCreateRoomPage from "./pages/TutorCreateRoomPage";
import WhiteBoard from "./pages/WhiteBoard";
import StudentJoinPage from "./pages/StudentJoinPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StudentJoinPage />} />
      <Route path="/createClass" element={<TutorCreateRoomPage />} />
      <Route path="/class/:roomId" element={<WhiteBoard />} />
    </Routes>
  );
}
