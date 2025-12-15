// WhiteBoard.jsx
import React, { useEffect, useRef, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import {
  useGenerateRoomTokenMutation,
  useStartRecordingMutation,
  useStopRecordingMutation,
} from "../slices/roomApiSlice";
import { useNavigate } from "react-router-dom";

const RECORDER_UID = "1001";

export default function WhiteBoard() {
  const [channelName, setChannelName] = useState("");
  const [joined, setJoined] = useState(false);
  const [role, setRole] = useState("");
  const [classDetails, setClassDetails] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingInfo, setRecordingInfo] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("recordingInfo") || "null");
    } catch {
      return null;
    }
  });

  const client = useRef(null);
  const localTracksRef = useRef({ audio: null, video: null, screen: null });
  const containersRef = useRef({});
  const localContainerRef = useRef(null);
  const startRecordingCalledRef = useRef(false);

  const navigate = useNavigate();

  const [createToken] = useGenerateRoomTokenMutation();
  const [startRecording] = useStartRecordingMutation();
  const [stopRecording] = useStopRecordingMutation();

  /* ---------------- load saved info ---------------- */
  useEffect(() => {
    const ch = localStorage.getItem("className");
    const r = localStorage.getItem("role");
    const cd = JSON.parse(localStorage.getItem("classDetails") || "null");
    setChannelName(ch);
    setRole(r);
    setClassDetails(cd);

    if (r === "host") {
      const stored = JSON.parse(localStorage.getItem("recordingInfo") || "null");
      if (stored) {
        setRecordingInfo(stored);
        setIsRecording(true);
      }
    }
  }, []);

  /* ---------------- init Agora ---------------- */
  useEffect(() => {
    client.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    return () => {
      try {
        client.current && client.current.removeAllListeners();
      } catch {}
    };
  }, []);

  /* ---------------- get token ---------------- */
  const getToken = async (classCode) => {
    const uid = Math.floor(Math.random() * 100000);
    const res = await createToken({ classCode, uid, role }).unwrap();
    return { token: res.token, uid };
  };

  /* ---------------- start recording ---------------- */
  const startRecordingHandler = async () => {
    if (isRecording) return;
    try {
      const payload = {
        channelName: localStorage.getItem("classCode") || classDetails?.roomId,
      };
      const res = await startRecording(payload);
      const data = res?.data ?? res;
      if (data && data.resourceId && data.sid) {
        setRecordingInfo(data);
        localStorage.setItem("recordingInfo", JSON.stringify(data));
        setIsRecording(true);
        console.log("Recording started:", data);
      }
    } catch (err) {
      console.error("startRecordingHandler error:", err);
    }
  };

  /* ---------------- stop recording ---------------- */
  const stopRecordingHandler = async () => {
    try {
      const info = recordingInfo || JSON.parse(localStorage.getItem("recordingInfo") || "null");
      if (!info || !info.resourceId || !info.sid) return;
      const req = {
        resourceId: info.resourceId,
        sid: info.sid,
        channelName: localStorage.getItem("classCode") || classDetails?.roomId,
      };
      const res = await stopRecording(req);
      const data = res?.data ?? res;
      setIsRecording(false);
      setRecordingInfo(null);
      localStorage.removeItem("recordingInfo");

      if (data?.recordingUrl) {
        const open = window.confirm("Recording saved. Open now?");
        if (open) window.open(data.recordingUrl, "_blank");
      } else if (data?.message) {
        window.alert(`Stop result: ${data.message}`);
      }
      return data;
    } catch (err) {
      console.error("stopRecordingHandler error:", err);
      setIsRecording(false);
      return null;
    }
  };

  /* ---------------- join class ---------------- */
  const joinClass = async (classCode = classDetails?.roomId, userRole = role) => {
    if (!classCode) return alert("Enter Room Code");

    const { token, uid } = await getToken(classCode);
    localStorage.setItem("classCode", classCode);
    localStorage.setItem("uid", uid);

    try {
      if (userRole === "host") await client.current.setClientRole("host");
    } catch {}

    await client.current.join(
      import.meta.env.VITE_AGORA_APP_ID || "YOUR_AGORA_APP_ID",
      classCode,
      token,
      uid
    );

    // create tracks
    try {
      const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
      localTracksRef.current.audio = tracks[0];
      localTracksRef.current.video = tracks[1];
    } catch {
      try {
        localTracksRef.current.audio = await AgoraRTC.createMicrophoneAudioTrack();
      } catch {}
    }

    // publish local tracks
    const publishList = [];
    if (localTracksRef.current.audio) publishList.push(localTracksRef.current.audio);
    if (localTracksRef.current.video) publishList.push(localTracksRef.current.video);
    if (publishList.length > 0) {
      try {
        await client.current.publish(publishList);
      } catch (e) {
        console.warn("publish failed", e);
      }
    }

    // add local participant
    const localName = userRole === "host" ? "Mentor (You)" : "Student (You)";
    setParticipants((p) => [
      ...p.filter((x) => x.uid !== uid),
      {
        uid,
        name: localName,
        hasVideo: !!localTracksRef.current.video,
        hasAudio: !!localTracksRef.current.audio,
        raised: false,
      },
    ]);

    // play local video
    setTimeout(() => {
      try {
        if (localTracksRef.current.video && localContainerRef.current) {
          localTracksRef.current.video.play(localContainerRef.current);
        }
      } catch {}
    }, 200);

    setJoined(true);

    /* ---------------- handle remote users ---------------- */
    client.current.on("user-published", async (user, mediaType) => {
      await client.current.subscribe(user, mediaType);

      setParticipants((prev) => {
        const exists = prev.some((p) => p.uid === user.uid);
        const entry = {
          uid: user.uid,
          name: user.role === "host" ? "Mentor" : "Student",
          hasVideo: !!user.videoTrack,
          hasAudio: !!user.audioTrack,
          raised: false,
        };
        if (exists) return prev.map((p) => (p.uid === user.uid ? { ...p, ...entry } : p));
        return [...prev, entry];
      });

      setTimeout(() => {
        const el = containersRef.current[user.uid];
        if (!el) return;
        if (mediaType === "video" && user.videoTrack) user.videoTrack.play(el);
        if (mediaType === "audio" && user.audioTrack) user.audioTrack.play?.();
      }, 150);
    });

    client.current.on("user-unpublished", (user, mediaType) => {
      if (!user) return;
      setParticipants((prev) =>
        prev.map((p) =>
          p.uid === user.uid
            ? {
                ...p,
                hasVideo: mediaType === "video" ? false : p.hasVideo,
                hasAudio: mediaType === "audio" ? false : p.hasAudio,
              }
            : p
        )
      );
    });

    client.current.on("user-left", (user) => {
      if (!user) return;
      setParticipants((prev) => prev.filter((p) => p.uid !== user.uid));
      delete containersRef.current[user.uid];
    });

    // host auto start recording
    if (userRole === "host") {
      (async () => {
        if (!startRecordingCalledRef.current) {
          startRecordingCalledRef.current = true;
          await startRecordingHandler();
        }
      })();
    }
  };

  /* ---------------- toggles ---------------- */
  const toggleMic = async () => {
    const audio = localTracksRef.current.audio;
    if (!audio) {
      try {
        const mic = await AgoraRTC.createMicrophoneAudioTrack();
        localTracksRef.current.audio = mic;
        await client.current.publish(mic);
      } catch {
        alert("Mic permission blocked.");
      }
      return;
    }
    audio.setEnabled(!audio.enabled);
    setParticipants((p) =>
      p.map((x) =>
        x.name.includes("(You)") ? { ...x, hasAudio: audio.enabled } : x
      )
    );
  };

  const toggleCam = async () => {
    const video = localTracksRef.current.video;
    if (!video) {
      try {
        const cam = await AgoraRTC.createCameraVideoTrack();
        localTracksRef.current.video = cam;
        await client.current.publish(cam);
        setTimeout(() => cam.play(localContainerRef.current), 200);
      } catch {
        alert("Camera permission blocked.");
      }
      return;
    }
    video.setEnabled(!video.enabled);
    setParticipants((p) =>
      p.map((x) =>
        x.name.includes("(You)") ? { ...x, hasVideo: video.enabled } : x
      )
    );
  };

  const toggleScreen = async () => {
    if (!localTracksRef.current.screen) {
      try {
        const screenTrack = await AgoraRTC.createScreenVideoTrack({ encoderConfig: "1080p" });
        localTracksRef.current.screen = screenTrack;
        if (localTracksRef.current.video) await client.current.unpublish(localTracksRef.current.video);
        await client.current.publish(screenTrack);
        setTimeout(() => screenTrack.play(localContainerRef.current), 200);

        screenTrack.on("track-ended", async () => {
          try { await client.current.unpublish(screenTrack); } catch {}
          localTracksRef.current.screen = null;
          if (localTracksRef.current.video) {
            await client.current.publish(localTracksRef.current.video);
            localTracksRef.current.video.play(localContainerRef.current);
          }
        });
      } catch {
        alert("Screen share blocked.");
      }
    } else {
      try { await client.current.unpublish(localTracksRef.current.screen); } catch {}
      try { localTracksRef.current.screen.close(); } catch {}
      localTracksRef.current.screen = null;
      if (localTracksRef.current.video) {
        await client.current.publish(localTracksRef.current.video);
        localTracksRef.current.video.play(localContainerRef.current);
      }
    }
  };

  const toggleRaise = (uid) => {
    setParticipants((p) =>
      p.map((x) => (x.uid === uid ? { ...x, raised: !x.raised } : x))
    );
  };

  /* ---------------- leave class ---------------- */
  const leaveClass = async () => {
    try {
      if (role === "host" && recordingInfo) await stopRecordingHandler();
      await client.current.leave();
    } catch (e) {}
    Object.values(localTracksRef.current).forEach((t) => {
      try { t?.stop?.(); t?.close?.(); } catch {}
    });
    setParticipants([]);
    localTracksRef.current = { audio: null, video: null, screen: null };
    setJoined(false);
    localStorage.clear();
    if (role === "host") navigate("/createClass");
    else navigate("/");
  };

  /* ---------------- render video tiles ---------------- */
  const renderTile = (p) => {
    const isLocal = String(p.name).includes("(You)");
    const isVideoOn = isLocal
      ? !!localTracksRef.current.video && localTracksRef.current.video.enabled
      : !!p.hasVideo;

    return (
      <div key={p.uid} className="relative bg-black/20 rounded-lg overflow-hidden border border-white/10">
        {!isVideoOn && (
          <div className="absolute inset-0 bg-black flex items-center justify-center z-10 text-white font-semibold">
            Camera Off
          </div>
        )}
        <div
          ref={(el) => {
            containersRef.current[p.uid] = el;
            if (isLocal) localContainerRef.current = el;
          }}
          className="w-full h-full"
        />
        <div className="absolute bottom-0 w-full px-2 py-1 bg-black/50 flex items-center justify-between text-xs">
          <span>{p.name}</span>
          <div className="flex gap-2">
            {p.hasAudio ? <span>🔊</span> : <span className="opacity-40">🔇</span>}
            {isVideoOn ? <span>🎥</span> : <span className="opacity-40">📷</span>}
            <button onClick={() => toggleRaise(p.uid)} className={`px-1 rounded ${p.raised ? "bg-yellow-400/40" : "bg-white/20"}`}>✋</button>
          </div>
        </div>
      </div>
    );
  };

  /* ---------------- auto-join ---------------- */
  useEffect(() => {
    const savedChannel = localStorage.getItem("className");
    const savedRole = localStorage.getItem("role");
    const cd = JSON.parse(localStorage.getItem("classDetails") || "null");
    if (savedChannel && savedRole) {
      setChannelName(savedChannel);
      setRole(savedRole);
      setClassDetails(cd);
      setTimeout(() => joinClass(cd?.roomId, savedRole), 200);
    }
  }, []);

  /* ---------------- UI ---------------- */
  return (
    <div className="h-screen w-full bg-[#0a0f1f] text-white flex flex-col font-inter">
      <header className="w-full h-16 bg-black/20 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 fixed top-0 z-40">
        <div className="flex flex-col leading-tight">
          <span className="text-sm opacity-70">Class</span>
          <span className="text-lg font-semibold tracking-wide">{channelName}</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xs opacity-60 block">Class Code</span>
            <span className="font-semibold">{classDetails?.roomId}</span>
          </div>
          {isRecording && (
            <div className="flex items-center gap-2 bg-red-600/90 px-3 py-1 rounded-full text-xs shadow-md animate-pulse">
              <div className="w-2 h-2 bg-white rounded-full" />
              Recording
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 pt-20 pb-28 px-6 overflow-y-auto">
        <div className="grid gap-5 auto-rows-[300px] grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {participants.map(renderTile)}
        </div>
      </main>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="flex items-center gap-5 bg-black/50 backdrop-blur-xl px-8 py-4 rounded-2xl border border-white/10 shadow-lg">
          <button onClick={toggleMic} className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-2xl hover:bg-white/20 transition">🎤</button>
          <button onClick={toggleCam} className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-2xl hover:bg-white/20 transition">📷</button>
          <button onClick={toggleScreen} className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-2xl hover:bg-white/20 transition">🖥️</button>
          <button onClick={leaveClass} className="w-14 h-14 flex items-center justify-center rounded-full bg-red-600 text-white text-2xl hover:bg-red-700 transition shadow-lg">⏹</button>
        </div>
      </div>
    </div>
  );
}
