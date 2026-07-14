# Outdoor Together — Hackathon Starter

Stack:

- React + Vite
- FastAPI
- SQLite + SQLModel
- MapLibre GL JS
- OpenFreeMap vector style
- Browser Geolocation API

## Implemented

- full-screen bleak/dark MapLibre map;
- high-contrast roads;
- mobile-first bottom navigation;
- activities, room codes, participants and checkpoints;
- persistent user profiles;
- optional profile photo URL;
- unique friend codes;
- friend requests and acceptance;
- accepted-friend list;
- location-sharing privacy toggle;
- `navigator.geolocation.watchPosition()` on the map page;
- throttled location upload every 5 seconds;
- friend-location polling every 3 seconds;
- live MapLibre avatar markers;
- pulsing rings around the current user's photo;
- stale/offline visual state;
- locations older than 5 minutes are not returned to friends.

## Run backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

API docs:

```text
http://127.0.0.1:8000/docs
```

## Run frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:5173
```

For a phone on the same Wi-Fi, set the backend URL in `frontend/.env`:

```env
VITE_API_URL=http://YOUR_PC_LAN_IP:8000
```

Run Vite with the existing `host: true` setting and open:

```text
http://YOUR_PC_LAN_IP:5173
```

## Live-location architecture

```text
Browser watchPosition
      ↓
PUT /users/{id}/location   (max once / 5 sec)
      ↓
SQLite UserLocation
      ↓
GET /users/{id}/friends/locations   (every 3 sec)
      ↓
MapLibre marker.setLngLat(...)
```

Only accepted friends are eligible to receive a user's location, and only while `location_sharing_enabled=true`.

## Important hackathon limitation

The MVP stores the local `user_id` in `localStorage`; it does not yet use real authentication or signed access tokens. This is acceptable for a controlled demo, but production use of real location data requires authentication, authorization, HTTPS, abuse protection, and stricter CORS rules.

## Test with two users on one PC

Use two separate browser profiles or one normal window plus an Incognito window. Each profile receives a different local user identity. Exchange the 8-character friend codes, accept the request, enable location sharing and open the Map tab.

---

## Важливо для iPhone і тестування на кількох пристроях

Frontend тепер використовує відносний `/api`, а Vite проксіює його на локальний FastAPI `127.0.0.1:8000`.
Тому телефони більше не намагаються звертатися до `127.0.0.1` на самому телефоні.

### Локальна мережа

1. Запустіть backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

2. В іншому PowerShell запустіть frontend:

```powershell
cd frontend
npm install
npm run dev
```

Інші пристрої в LAN можуть відкрити адресу `http://IP_ВАШОГО_ПК:5173`.
Профілі, друзі й заявки працюватимуть через спільний backend завдяки `/api` proxy.

### Геолокація на iPhone

Для Geolocation API на iPhone потрібен secure context, практично — HTTPS. Звичайний `http://192.168.x.x:5173` не підходить.
Для швидкого demo можна відкрити один HTTPS tunnel саме на Vite (порт 5173); `/api` піде через той самий tunnel і Vite proxy у FastAPI.

Наприклад, якщо встановлено `cloudflared`:

```powershell
cloudflared tunnel --url http://localhost:5173
```

Відкрийте видану `https://...trycloudflare.com` адресу на iPhone. Backend окремо в Internet виставляти не потрібно.

### Той самий профіль на іншому пристрої

У `Профіль` є два коди:

- `Код друга` — публічний, ним обмінюються для заявок у друзі.
- `Секретний код профілю` — приватний, використовується для підключення того самого профілю на іншому пристрої.

На другому пристрої відкрийте `Профіль` → `Відкрити існуючий профіль` і введіть секретний код.

## Latest update: map privacy and event visibility

- Administrative region/state/province labels are hidden from MapLibre maps.
- Events can be `Public` or `Private`.
  - Public events appear in the public events list.
  - Private events do not appear in discovery and are joined by code.
- Location visibility has three modes:
  - `none`: location stays private and is not uploaded;
  - `friends`: accepted friends can see the live location;
  - `everyone`: other users can also see the live location.
- Non-host devices opened through an insecure `http://LAN-IP:5173` URL no longer receive an immediate blocking GPS error. The rest of the app remains usable.
- Browser geolocation still requires a secure context for real GPS access on Android. For multi-device GPS testing use the same HTTPS frontend URL for all devices (for example an HTTPS deployment or tunnel).


## Recommended launch commands

### PC development

From the project root:

```powershell
.\start-dev.ps1
```

This starts FastAPI, waits until `/health` responds, and then starts Vite. Do not open the app through a LAN IP unless you specifically need another device.

### Android / multi-device GPS testing

Install Cloudflare Tunnel once:

```powershell
winget install --id Cloudflare.cloudflared
```

Then run:

```powershell
.\start-android.ps1
```

Open the generated `https://...trycloudflare.com` URL on every Android device. The frontend, `/api` proxy and FastAPI backend then share one public HTTPS entry point, which is required for browser geolocation on non-localhost devices.

### Important diagnostic distinction

- `GPS needs HTTPS` means the page is opened through insecure `http://192.168...` and the browser will not expose geolocation.
- `Backend unavailable` means FastAPI on port `8000` is not running or crashed. The map can still work locally, but profiles, friends, events and shared location cannot sync until the backend reconnects.
