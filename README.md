# The Corner Table: Restaurant Management System

Full-stack restaurant back-of-house app. FastAPI + SQLAlchemy backend, React (Vite) frontend.

## What it does
- **Floor**: tables with one-click status (Free / Occupied / Reserved), live counts, admins can add and remove tables
- **Menu board**: colour-coded categories with a colour key, filter by category, "sold out" toggle
- **Ticket rail**: a kitchen-board style workflow (New > Cooking > Ready to serve > Awaiting bill) with
  ticket ages that turn amber then red, per-dish kitchen notes, auto-refresh, and a tap-to-add order composer
- **Team**: admins create staff and kitchen accounts (nobody can self-register as admin)

## Who can do what

| | Admin | Staff | Kitchen |
|---|---|---|---|
| Tabs | Floor, Menu, Ticket rail, Team | Floor, Menu, Ticket rail | Ticket rail, Menu |
| Add / remove tables | yes | no | no |
| Set table status | yes | yes | no |
| Add / remove menu items | yes | no | no |
| Mark dish sold out | yes | no | yes |
| Create tickets | yes | yes | no |
| Start cooking / mark ready | yes | no | yes |
| Mark served / close bill | yes | yes | no |
| Cancel ticket | any open ticket | new tickets only | no |
| See prices | yes | yes | no |
| Manage team | yes | no | no |

These rules are enforced in the API (`app/core/deps.py`, `app/services/order_service.py`), not just hidden in the UI.

## Run the backend
```
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```
API: http://127.0.0.1:8000, docs at /docs.

**Upgrading from an older version?** The database layout changed. Delete `backend/restaurant.db` once and restart
(this is a dev database; migrations with Alembic are a good next step).

## Run the frontend
```
cd frontend
npm install
npm run dev
```
Open http://127.0.0.1:5173. On first launch you'll be asked to create the admin account; add staff and kitchen
accounts from the Team tab.

## Tests
```
cd backend
pip install -r requirements-dev.txt
pytest
```
Covers first-time setup, every role boundary, the ticket lifecycle, table/menu soft-delete and auth.

## Design notes
Palette: bistro green `#2E4034`, brass `#B8862F`, paper `#F6F1E3`. Type: Fraunces (headings), IBM Plex Mono (data).
Category colours live in `frontend/src/lib/categories.js`; role rules in `frontend/src/lib/permissions.js`.
