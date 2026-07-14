import { useEffect, useState } from "react";
import { api } from "../api.js";
import BottomNav from "../components/BottomNav.jsx";
import {
  connectExistingUser,
  ensureCurrentUser,
  saveCurrentUser,
} from "../userSession.js";

function initials(name = "?") {
  return name.trim().slice(0, 2).toUpperCase();
}

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [connectCode, setConnectCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [connecting, setConnecting] = useState(false);

  function applyProfile(profile) {
    setUser(profile);
    setName(profile.name);
    setPhotoUrl(profile.photo_url || "");
    saveCurrentUser(profile);
  }

  useEffect(() => {
    ensureCurrentUser()
      .then(applyProfile)
      .catch((err) => setError(err.message));
  }, []);

  async function saveProfile(event) {
    event.preventDefault();
    if (!user) return;

    setError("");
    setMessage("");
    try {
      const updated = await api.updateUser(user.id, {
        name: name.trim(),
        photo_url: photoUrl.trim(),
      });
      applyProfile(updated);
      setMessage("Профіль збережено");
    } catch (err) {
      setError(err.message);
    }
  }

  async function connectProfile(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setConnecting(true);
    try {
      const connected = await connectExistingUser(connectCode);
      applyProfile(connected);
      setConnectCode("");
      setMessage("Цей пристрій підключено до існуючого профілю");
    } catch (err) {
      setError(err.message);
    } finally {
      setConnecting(false);
    }
  }

  async function toggleLocationSharing() {
    if (!user) return;

    setError("");
    try {
      const updated = await api.setLocationSharing(
        user.id,
        !user.location_sharing_enabled
      );
      applyProfile(updated);
      setMessage(
        updated.location_sharing_enabled
          ? "Передачу геолокації увімкнено"
          : "Передачу геолокації вимкнено"
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function copyValue(value, fallbackMessage) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage("Код скопійовано");
    } catch {
      setMessage(fallbackMessage);
    }
  }

  return (
    <main className="main-tab-page">
      <div className="tab-page__content">
        <div className="profile-hero">
          <div className="profile-avatar profile-avatar--photo">
            {photoUrl ? (
              <img src={photoUrl} alt={name || "User"} />
            ) : (
              initials(name || user?.name)
            )}
          </div>
          <div>
            <div className="eyebrow">Профіль</div>
            <h1>{user?.name || "Завантаження..."}</h1>
          </div>
        </div>

        {user && (
          <>
            <button
              className="friend-code-card"
              type="button"
              onClick={() => copyValue(user.friend_code, `Код друга: ${user.friend_code}`)}
            >
              <span>Публічний код для додавання в друзі</span>
              <strong>{user.friend_code}</strong>
              <small>Його можна безпечно дати друзям</small>
            </button>

            <button
              className="friend-code-card profile-sync-card"
              type="button"
              onClick={() => copyValue(user.profile_code, `Код профілю: ${user.profile_code}`)}
            >
              <span>Секретний код профілю</span>
              <strong>{user.profile_code}</strong>
              <small>Введіть його на іншому пристрої. Не передавайте стороннім.</small>
            </button>

            <section className="settings-card">
              <div>
                <strong>Ділитися геолокацією</strong>
                <span>Лише прийняті друзі бачать вашу актуальну позицію.</span>
              </div>
              <button
                type="button"
                className={`toggle${user.location_sharing_enabled ? " is-on" : ""}`}
                onClick={toggleLocationSharing}
                aria-pressed={user.location_sharing_enabled}
              >
                <span />
              </button>
            </section>

            <form className="profile-form" onSubmit={saveProfile}>
              <label>
                Ім'я
                <input value={name} onChange={(event) => setName(event.target.value)} minLength="2" required />
              </label>
              <label>
                URL фото
                <input
                  value={photoUrl}
                  onChange={(event) => setPhotoUrl(event.target.value)}
                  placeholder="https://..."
                  inputMode="url"
                />
              </label>
              <button className="button primary" type="submit">Зберегти профіль</button>
            </form>

            <section className="profile-connect-card">
              <div className="eyebrow">Інший пристрій</div>
              <h2>Відкрити існуючий профіль</h2>
              <p className="muted">
                Введіть секретний код профілю з іншого телефона або комп’ютера.
              </p>
              <form className="friend-add-form" onSubmit={connectProfile}>
                <input
                  value={connectCode}
                  onChange={(event) => setConnectCode(event.target.value.toUpperCase())}
                  placeholder="Секретний код профілю"
                  minLength="12"
                  maxLength="16"
                  required
                />
                <button className="button primary" type="submit" disabled={connecting}>
                  {connecting ? "Підключення..." : "Підключити"}
                </button>
              </form>
            </section>
          </>
        )}

        {message && <p className="success-message">{message}</p>}
        {error && <p className="error">{error}</p>}
      </div>
      <BottomNav />
    </main>
  );
}
