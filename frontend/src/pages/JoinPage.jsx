import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function JoinPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const normalizedCode = code.trim().toUpperCase();

    try {
      await api.joinActivity(normalizedCode, { name: name.trim() });
      localStorage.setItem("player_name", name.trim());
      navigate(`/room/${normalizedCode}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <h1>Приєднатися</h1>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          Ваше ім'я
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength="2"
            required
          />
        </label>

        <label>
          Код кімнати
          <input
            className="room-code-input"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            minLength="6"
            maxLength="6"
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="button primary" disabled={loading}>
          {loading ? "Вхід..." : "Увійти"}
        </button>
      </form>
    </section>
  );
}
