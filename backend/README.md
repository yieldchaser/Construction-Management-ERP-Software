# SiteFlow backend

The FastAPI application for SiteFlow. It exposes the versioned REST API under `/apis/v3` and connects to Supabase PostgreSQL (production) or SQLite (local dev) through SQLAlchemy 2.0.

## Stack

- FastAPI (Python 3.12), Uvicorn, SQLAlchemy 2.0, Pydantic v2 (pydantic-settings)
- Auth: python-jose (JWT), passlib + bcrypt, firebase-admin
- openpyxl (BOQ import), slowapi (rate limiting), sentry-sdk (optional)

## Run locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

OpenAPI docs: `http://localhost:8000/docs`. On first run the SQLite schema is created from the models. Load demo data with `python scripts/seed_demo_data.py` (this deletes any existing `test.db`).

## Layout

```
backend/
├── app/
│   ├── main.py                 # app factory, CORS, router registration
│   ├── config.py               # pydantic-settings (all env vars)
│   ├── database.py             # engine/session, SQLite/Postgres UUID shim
│   ├── models.py               # SQLAlchemy ORM models
│   ├── auth.py                 # multi-provider auth + OTP + onboarding
│   ├── security.py / rate_limit.py / email_otp.py / sms.py / firebase_auth.py
│   ├── routers/                # one module per domain, all under /apis/v3
│   └── utils/                  # PDF generators
├── scripts/                    # seed_demo_data.py, backfill_files_to_storage.py, ...
└── tests/                      # phase integration tests (fresh SQLite each)
```

## Routers (all mounted under `/apis/v3`)

auth, calculators, budgeting, planning, drawings, procurement, billing, hr, quality, reports, equipment, safety, analytics, production, dpr, crm, finance (+ cashbook), tally, subcon_attendance, settings, assets, three_way, wastage, chat, custom_fields, statutory, face_recognition, subcon_performance, vendor_performance, rfq, labour, towers, budget, library, profile, mom, projects, todos, delete_logs, files, team_schedule, google_sheets, google_auth, admin_migrations.

See `README.md` (repo root) for the full feature mapping and the environment-variable reference.

## Database and migrations

Local dev builds the schema from models via `Base.metadata.create_all`. Production uses hand-authored, additive SQL in `../supabase/migrations/` (no Alembic). Apply those to Supabase; keep migrations additive and backward-compatible.

## Tests

`backend/tests/` contains per-phase integration tests that spin up a fresh SQLite database. Run an example with `python tests/test_phase2.py` (BOQ + Gantt), or `test_phase7.py` (procurement), `test_phase8.py` (billing), and so on.
