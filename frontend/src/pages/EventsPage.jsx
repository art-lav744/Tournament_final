import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import BottomNav from "../components/BottomNav.jsx";
import { ensureCurrentUser } from "../userSession.js";

export default function EventsPage() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    ensureCurrentUser()
      .then(async (profile) => {
        if (!active) return;
        setUser(profile);
        const data = await api.getUserActivities(profile.id);
        if (active) setEvents(data);
      })
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="main-tab-page">
      <div className="tab-page__content">
        <div className="eyebrow">Активності</div>
        <h1>Події</h1>
        <p className="muted">
          Події прив’язані до вашого профілю. Створені та приєднані події автоматично з’являються на головній карті.
        </p>

        <div className="event-actions">
          <Link className="event-action-card" to="/create">
            <span className="event-action-card__symbol">+</span>
            <div>
              <strong>Створити подію</strong>
              <span>Одна точка на карті, один організатор</span>
            </div>
          </Link>

          <Link className="event-action-card" to="/join">
            <span className="event-action-card__symbol">#</span>
            <div>
              <strong>Приєднатися</strong>
              <span>Участь буде записана на профіль {user?.name || "користувача"}</span>
            </div>
          </Link>
        </div>

        <section className="event-list-section">
          <h2>Мої події</h2>
          {events.length ? (
            <div className="event-list">
              {events.map((event) => (
                <Link className="event-list-card" key={event.id} to={`/room/${event.code}`}>
                  <span className="event-list-card__pin">●</span>
                  <div>
                    <strong>{event.title}</strong>
                    <span>{event.description || `Код ${event.code}`}</span>
                  </div>
                  <small>{event.host_user_id === user?.id ? "Організатор" : "Учасник"}</small>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">Ви ще не створили та не приєдналися до жодної події.</div>
          )}
        </section>

        {error && <p className="error">{error}</p>}
      </div>
      <BottomNav />
    </main>
  );
}
