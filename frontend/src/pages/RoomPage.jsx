import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";
import CheckpointMap from "../components/CheckpointMap.jsx";

export default function RoomPage() {
  const { code } = useParams();

  const [activity, setActivity] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [error, setError] = useState("");

  const isHost = localStorage.getItem(`is_host_${code}`) === "true";

  const loadRoom = useCallback(async () => {
    try {
      const [activityData, participantsData, checkpointsData] =
        await Promise.all([
          api.getActivity(code),
          api.getParticipants(code),
          api.getCheckpoints(code),
        ]);

      setActivity(activityData);
      setParticipants(participantsData);
      setCheckpoints(checkpointsData);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [code]);

  useEffect(() => {
    loadRoom();

    const intervalId = window.setInterval(loadRoom, 5000);
    return () => window.clearInterval(intervalId);
  }, [loadRoom]);

  async function handleCreateCheckpoint(payload) {
    try {
      await api.createCheckpoint(code, payload);
      await loadRoom();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !activity) {
    return <p className="error">{error}</p>;
  }

  if (!activity) {
    return <p>Завантаження...</p>;
  }

  return (
    <div className="room-layout">
      <section className="card">
        <div className="room-heading">
          <div>
            <div className="eyebrow">Код кімнати</div>
            <div className="room-code">{activity.code}</div>
          </div>

          {isHost && <span className="badge">Організатор</span>}
        </div>

        <h1>{activity.title}</h1>
        {activity.description && (
          <p className="muted">{activity.description}</p>
        )}
      </section>

      <section className="card">
        <h2>Учасники ({participants.length})</h2>
        <ul className="participant-list">
          {participants.map((participant) => (
            <li key={participant.id}>
              <span>{participant.name}</span>
              {participant.is_host && <span className="badge">Host</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="card map-card">
        <h2>Маршрут / контрольні точки</h2>

        <CheckpointMap
          checkpoints={checkpoints}
          canEdit={isHost}
          onCreateCheckpoint={handleCreateCheckpoint}
        />

        {error && <p className="error">{error}</p>}
      </section>
    </div>
  );
}
