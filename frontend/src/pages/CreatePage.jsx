import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function CreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    creator_name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const activity = await api.createActivity(form);

      localStorage.setItem("player_name", form.creator_name);
      localStorage.setItem(`is_host_${activity.code}`, "true");

      navigate(`/room/${activity.code}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <h1>Створити активність</h1>

      <form className="form" onSubmit={handleSubmit}>
        <label>
          Ваше ім'я
          <input
            name="creator_name"
            value={form.creator_name}
            onChange={updateField}
            minLength="2"
            required
          />
        </label>

        <label>
          Назва активності
          <input
            name="title"
            value={form.title}
            onChange={updateField}
            minLength="3"
            required
          />
        </label>

        <label>
          Опис
          <textarea
            name="description"
            value={form.description}
            onChange={updateField}
            rows="4"
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button className="button primary" disabled={loading}>
          {loading ? "Створення..." : "Створити кімнату"}
        </button>
      </form>
    </section>
  );
}
