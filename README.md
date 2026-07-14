# Outdoor Activity Hackathon Starter

Стартова кодова база для вебзастосунку:

- Frontend: React + Vite
- Backend: FastAPI
- Database: SQLite + SQLModel
- Map: Leaflet + React-Leaflet
- API: REST / JSON

## Що вже працює

- створення активності;
- автоматична генерація коду кімнати;
- приєднання учасника за кодом;
- перегляд учасників;
- додавання контрольної точки кліком по карті;
- перегляд контрольних точок на карті;
- збереження даних у SQLite;
- Swagger/OpenAPI документація FastAPI.

---

## 1. Запуск backend

Потрібен Python 3.11+.

### Windows PowerShell

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend:
- API: http://127.0.0.1:8000
- Swagger: http://127.0.0.1:8000/docs

---

## 2. Запуск frontend

Потрібен Node.js.

```bash
cd frontend
npm install
npm run dev
```

Frontend:
- http://localhost:5173

За замовчуванням frontend звертається до:

```text
http://127.0.0.1:8000
```

Щоб змінити адресу backend, створіть `frontend/.env`:

```env
VITE_API_URL=http://192.168.1.100:8000
```

Це знадобиться, якщо тестуєте сайт на телефоні в локальній мережі.

---

## Основний сценарій MVP

1. Організатор відкриває сайт.
2. Створює активність.
3. Отримує код кімнати.
4. Інші учасники вводять код та ім'я.
5. У кімнаті видно учасників.
6. Організатор додає контрольні точки на карті.
7. Команда проходить активність.

---

## Розподіл роботи для 4 людей

### Frontend
- сторінки;
- компоненти;
- responsive/mobile-first;
- інтеграція з API.

### Backend
- FastAPI endpoints;
- бізнес-логіка;
- валідація.

### Data / Logic
- SQLModel;
- моделі;
- прогрес;
- GPS-перевірка.

### Product / QA / Integration
- user flow;
- тестування на телефонах;
- README;
- презентація;
- AI-log;
- GitHub Issues.

---

## Що додавати далі

У такому порядку:

1. Позначення checkpoint як виконаного.
2. Перевірка відстані до checkpoint через GPS.
3. Екран фінішу.
4. Polling учасників/прогресу раз на 3–5 секунд.
5. PWA.
6. Лише потім — фото, QR, realtime або рейтинг.

Не починайте зі складної авторизації, WebSocket чи Redux.
