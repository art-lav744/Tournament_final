import { api } from "./api.js";

const USER_ID_KEY = "outdoor_user_id";
const PROFILE_CODE_KEY = "outdoor_profile_code";

export function saveCurrentUser(user) {
  localStorage.setItem(USER_ID_KEY, String(user.id));
  if (user.profile_code) {
    localStorage.setItem(PROFILE_CODE_KEY, user.profile_code);
  }
  localStorage.setItem("player_name", user.name);
}

export async function connectExistingUser(profileCode) {
  const user = await api.connectUser(profileCode.trim().toUpperCase());
  saveCurrentUser(user);
  return user;
}

export async function ensureCurrentUser() {
  const storedId = Number(localStorage.getItem(USER_ID_KEY));

  if (Number.isInteger(storedId) && storedId > 0) {
    try {
      const user = await api.getUser(storedId);
      saveCurrentUser(user);
      return user;
    } catch {
      localStorage.removeItem(USER_ID_KEY);
    }
  }

  const storedProfileCode = localStorage.getItem(PROFILE_CODE_KEY);
  if (storedProfileCode) {
    try {
      return await connectExistingUser(storedProfileCode);
    } catch {
      localStorage.removeItem(PROFILE_CODE_KEY);
    }
  }

  const fallbackName = (localStorage.getItem("player_name") || "Guest").trim();
  const user = await api.createUser({
    name: fallbackName.length >= 2 ? fallbackName : "Guest",
    photo_url: null,
  });

  saveCurrentUser(user);
  return user;
}
