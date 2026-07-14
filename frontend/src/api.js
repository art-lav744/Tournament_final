const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let message = "Помилка запиту";

    try {
      const data = await response.json();
      message = data.detail || message;
    } catch {
      // Keep fallback message.
    }

    throw new Error(message);
  }

  return response.json();
}

export const api = {
  createActivity(payload) {
    return request("/activities", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getActivity(code) {
    return request(`/activities/${code}`);
  },

  joinActivity(code, payload) {
    return request(`/activities/${code}/join`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getParticipants(code) {
    return request(`/activities/${code}/participants`);
  },

  getCheckpoints(code) {
    return request(`/activities/${code}/checkpoints`);
  },

  createCheckpoint(code, payload) {
    return request(`/activities/${code}/checkpoints`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
