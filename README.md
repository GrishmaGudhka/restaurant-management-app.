# Restaurant Management System

Full-stack restaurant management app — FastAPI backend + React (Vite) frontend.

## Features
- **Auth**: register/login with JWT, role-based access (admin / staff / kitchen)
- **Menu**: CRUD for menu items (admin only for create/update/delete)
- **Tables**: create tables, track status (free / occupied / reserved)
- **Orders**: place an order for a table (multiple items + quantities), track status
  through pending → preparing → ready → served → closed. Opening an order
  auto-occupies the table; closing it auto-frees the table.

## Run the backend

```
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Backend runs at `http://127.0.0.1:8000`. Interactive API docs: `http://127.0.0.1:8000/docs`

## Run the frontend

```
cd frontend
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:5173`. Open it, register an **admin** account
first (needed to create menu items and tables), then log in.

## Typical flow to try it out

1. Register as `admin`, log in
2. Go to **Tables** → add a table (e.g. number 1, capacity 4)
3. Go to **Menu** → add a couple of items
4. Go to **Orders** → place an order for the table with some items
5. Watch the table flip to "occupied" automatically
6. Advance the order through its statuses; when it hits "closed" the table frees up again

## Project structure

```
backend/
  app/
    models/      SQLAlchemy tables
    schemas/      Pydantic request/response shapes
    routers/      API endpoints
    core/          auth/security helpers
    main.py        app entrypoint
frontend/
  src/
    api/           fetch wrapper for the backend
    context/       auth state (JWT in localStorage)
    pages/         Login, Tables, Menu, Orders
    App.jsx
```

## What's next (not built yet)

- Reservations (booking a table ahead of time)
- Inventory tracking tied to menu items
- Basic analytics dashboard (revenue, top items)
- Swap SQLite → Postgres for deployment (`DATABASE_URL` in `.env`)
- Deploy: backend to Render/Railway, frontend to Vercel
