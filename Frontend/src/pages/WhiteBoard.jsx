// WhiteBoard.jsx
import React, { useState, useEffect, useRef } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";
import { useCreateRoomMutation } from "../slices/roomApiSlice";

function WhiteBoard() {
  const [channelName, setChannelName] = useState("");
  const [joined, setJoined] = useState(false);
  const [role, setRole] = useState("host");

  const [createRoom] = useCreateRoomMutation();

  const client = useRef(null);
  const localTracksRef = useRef({ audio: null, video: null, screen: null });
  const [participants, setParticipants] = useState([]);
  const containersRef = useRef({});
  const localContainerRef = useRef(null);

  /* ---------------- INIT AGORA CLIENT ---------------- */
  useEffect(() => {
    client.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
    return () => {
      try {
        client.current && client.current.removeAllListeners();
      } catch {}
    };
  }, []);

  /* ---------------- AUTO JOIN ---------------- */
  useEffect(() => {
    const savedChannel = localStorage.getItem("className");
    const savedRole = localStorage.getItem("role");
    if (savedChannel && savedRole) {
      setChannelName(savedChannel);
      setRole(savedRole);
      setTimeout(() => joinClass(savedChannel, savedRole), 200);
    }
  }, []);

  /* ---------------- TOKEN FETCHER ---------------- */
  const getToken = async (chName) => {
    const uid = Math.floor(Math.random() * 100000);
    const res = await createRoom({ channelName: chName, uid, role }).unwrap();
    return { token: res.token, uid };
  };

  /* ---------------- JOIN CLASS ---------------- */
  const joinClass = async (chName = channelName, userRole = role) => {
    if (!chName) return alert("Enter Room Name");

    const { token, uid } = await getToken(chName);

    localStorage.setItem("className", chName);
    localStorage.setItem("role", userRole);

    try {
      await client.current.setClientRole("host");
    } catch {}

    await client.current.join(
      import.meta.env.VITE_AGORA_APP_ID || "143ec8542abf4df2851d3df3b69f2d89",
      chName,
      token,
      uid
    );

    let audioTrack = null,
      videoTrack = null;

    try {
      const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
      audioTrack = tracks[0];
      videoTrack = tracks[1];
      localTracksRef.current.audio = audioTrack;
      localTracksRef.current.video = videoTrack;
    } catch {
      try {
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localTracksRef.current.audio = audioTrack;
      } catch {}
    }

    const publishList = [];
    if (localTracksRef.current.audio)
      publishList.push(localTracksRef.current.audio);
    if (localTracksRef.current.video)
      publishList.push(localTracksRef.current.video);

    if (publishList.length > 0) await client.current.publish(publishList);

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

    setTimeout(() => {
      if (localTracksRef.current.video && localContainerRef.current) {
        try {
          localTracksRef.current.video.play(localContainerRef.current);
        } catch {}
      }
    }, 250);

    setJoined(true);

    /* ---------------- REMOTE EVENTS ---------------- */

    client.current.on("user-published", async (user, mediaType) => {
      await client.current.subscribe(user, mediaType);

      setParticipants((prev) => [
        ...prev.filter((x) => x.uid !== user.uid),
        {
          uid: user.uid,
          name: user.role === "host" ? "Mentor" : "Student",
          hasVideo: !!user.videoTrack,
          hasAudio: !!user.audioTrack,
          raised: false,
        },
      ]);

      setTimeout(() => {
        const el = containersRef.current[user.uid];
        try {
          if (mediaType === "video" && user.videoTrack && el)
            user.videoTrack.play(el);
          if (mediaType === "audio" && user.audioTrack) user.audioTrack.play();
        } catch {}
      }, 150);
    });

    client.current.on("user-unpublished", (user) => {
      setParticipants((prev) => prev.filter((x) => x.uid !== user.uid));
      if (containersRef.current[user.uid]) {
        containersRef.current[user.uid].innerHTML = "";
      }
    });

    client.current.on("user-left", (user) => {
      setParticipants((prev) => prev.filter((x) => x.uid !== user.uid));
      if (containersRef.current[user.uid]) {
        containersRef.current[user.uid].innerHTML = "";
      }
    });
  };

  /* ---------------- MIC ---------------- */
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

  /* ---------------- CAMERA ---------------- */
  const toggleCam = async () => {
    const video = localTracksRef.current.video;

    if (!video) {
      try {
        const cam = await AgoraRTC.createCameraVideoTrack();
        localTracksRef.current.video = cam;
        await client.current.publish(cam);

        setTimeout(() => {
          if (localContainerRef.current) cam.play(localContainerRef.current);
        }, 200);
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

  /* ---------------- SCREEN SHARE ---------------- */
  const toggleScreen = async () => {
    if (!localTracksRef.current.screen) {
      try {
        const screenTrack = await AgoraRTC.createScreenVideoTrack({
          encoderConfig: "1080p",
        });

        localTracksRef.current.screen = screenTrack;

        await client.current.unpublish(localTracksRef.current.video || []);
        await client.current.publish(screenTrack);

        setTimeout(() => {
          if (localContainerRef.current)
            screenTrack.play(localContainerRef.current);
        }, 200);

        screenTrack.on("track-ended", async () => {
          await client.current.unpublish(screenTrack);
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
      await client.current.unpublish(localTracksRef.current.screen);
      localTracksRef.current.screen.close();
      localTracksRef.current.screen = null;

      if (localTracksRef.current.video) {
        await client.current.publish(localTracksRef.current.video);
        localTracksRef.current.video.play(localContainerRef.current);
      }
    }
  };

  /* ---------------- RAISE HAND ---------------- */
  const toggleRaise = (uid) => {
    setParticipants((p) =>
      p.map((x) => (x.uid === uid ? { ...x, raised: !x.raised } : x))
    );
  };

  /* ---------------- REQUEST TO JOIN (STUDENT) ---------------- */
  const requestToJoin = async () => {
    try {
      await fetch("/api/room/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelName,
          studentName: "Student",
        }),
      });
      alert("Request Sent");
    } catch {
      alert("Request failed.");
    }
  };

  /* ---------------- LEAVE ---------------- */
  const leaveClass = async () => {
    try {
      await client.current.leave();
    } catch {}

    Object.values(localTracksRef.current).forEach((t) => {
      try {
        t.stop();
        t.close();
      } catch {}
    });

    setParticipants([]);
    localTracksRef.current = {};
    setJoined(false);
    localStorage.removeItem("className");
    localStorage.removeItem("role");
  };

  /* ---------------- RENDER TILE ---------------- */
  const renderTile = (p) => {
    const isLocal = p.name.includes("(You)");

    return (
      <div key={p.uid} style={styles.videoBox}>
        <div
          ref={(el) => {
            if (isLocal) localContainerRef.current = el;
            containersRef.current[p.uid] = el;
          }}
          style={styles.video}
        />

        <div style={styles.nameRow}>
          <span style={styles.nameTag}>{p.name}</span>

          <div style={{ display: "flex", gap: 6 }}>
            {p.hasAudio ? (
              <span style={styles.badge}>🔊</span>
            ) : (
              <span style={styles.badgeOff}>🔇</span>
            )}

            {p.hasVideo ? (
              <span style={styles.badge}>🎥</span>
            ) : (
              <span style={styles.badgeOff}>📷</span>
            )}

            <button
              onClick={() => toggleRaise(p.uid)}
              style={p.raised ? styles.raisedBtn : styles.raiseBtn}
            >
              ✋
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ---------------- UI ---------------- */
  return (
    <div style={styles.page}>
      {!joined ? (
        /* ---------------- JOIN SCREEN ---------------- */
        <div style={styles.joinCard}>
          <h1 style={styles.heading}>🎥 Live Class</h1>
          <p style={styles.sub}>Join by room name</p>

          <input
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="Room name"
            style={styles.input}
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={styles.select}
          >
            <option value="host">Mentor</option>
            <option value="student">Student</option>
          </select>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => joinClass()} style={styles.joinBtn}>
              Join
            </button>

            {role === "student" && (
              <button onClick={requestToJoin} style={styles.requestBtn}>
                Request
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ---------------- CLASSROOM ---------------- */
        <div style={styles.classRoom}>
          {/* TOP BAR */}
          <div style={styles.topBar}>
            <span>
              Class: <b>{channelName}</b>
            </span>
          </div>

          {/* VIDEO GRID */}
          <div style={styles.grid}>{participants.map(renderTile)}</div>

          {/* BOTTOM CONTROL BAR */}
          <div style={styles.bottomControls}>
            <button style={styles.controlBtn} onClick={toggleMic}>
              🎤
            </button>
            <button style={styles.controlBtn} onClick={toggleCam}>
              📷
            </button>
            <button style={styles.controlBtn} onClick={toggleScreen}>
              🖥️
            </button>
            <button style={styles.leaveBtnCircle} onClick={leaveClass}>
              ⏹
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- PREMIUM UI STYLES ---------------- */
const styles = {
  page: {
    height: "100vh",
    background: "linear-gradient(135deg, #0b1120, #1e293b, #0b1120)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontFamily: "Inter",
  },

  joinCard: {
    width: 420,
    padding: 30,
    borderRadius: 20,
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.15)",
    boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
  },

  heading: { fontSize: 28, marginBottom: 10 },
  sub: { opacity: 0.7, marginBottom: 20 },

  input: {
    width: "100%",
    padding: 14,
    marginBottom: 14,
    borderRadius: 12,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "#fff",
  },

  select: {
    width: "100%",
    padding: 14,
    marginBottom: 14,
    borderRadius: 12,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "#fff",
  },

  joinBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    fontWeight: 600,
    cursor: "pointer",
  },

  requestBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    background: "rgba(255,255,255,0.2)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.3)",
    cursor: "pointer",
  },

  /* CLASSROOM */
  classRoom: { height: "100%", width: "100%", position: "relative" },

  topBar: {
    position: "absolute",
    top: 15,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "10px 24px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.1)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.2)",
    zIndex: 20,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 20,
    padding: 30,
    marginTop: 80,
  },

  videoBox: {
    position: "relative",
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(10px)",
    borderRadius: 16,
    overflow: "hidden",
    height: 230,
    border: "1px solid rgba(255,255,255,0.12)",
  },

  video: { width: "100%", height: "100%", background: "#000" },

  nameRow: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: "8px 12px",
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  nameTag: { fontSize: 14 },

  badge: { fontSize: 16 },
  badgeOff: { fontSize: 16, opacity: 0.4 },

  raiseBtn: {
    background: "rgba(255,255,255,0.2)",
    border: "none",
    color: "#fff",
    borderRadius: 8,
    padding: "4px 8px",
    cursor: "pointer",
  },

  raisedBtn: {
    background: "rgba(255,200,0,0.4)",
    border: "none",
    color: "#fff",
    borderRadius: 8,
    padding: "4px 8px",
    cursor: "pointer",
  },

  /* BOTTOM CONTROL BAR */
  bottomControls: {
    position: "absolute",
    bottom: 25,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: 20,
    background: "rgba(0,0,0,0.45)",
    padding: "14px 25px",
    borderRadius: 20,
    backdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.12)",
    zIndex: 20,
  },

  controlBtn: {
    width: 55,
    height: 55,
    borderRadius: "50%",
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.12)",
    fontSize: 26,
    cursor: "pointer",
    color: "#fff",
  },

  leaveBtnCircle: {
    width: 55,
    height: 55,
    borderRadius: "50%",
    fontSize: 26,
    background: "#dc2626",
    border: "none",
    color: "#fff",
    cursor: "pointer",
  },
};

export default WhiteBoard;
