# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**IshkopBot** is a Telegram Mini App job marketplace. Users interact via a Telegram bot and web mini-app to post/browse vacancies, resumes, and daily job seekers. Three user roles: `job_seeker`, `candidate_hunter`, `daily_job_seeker`.

## Development Commands

### Run (Local Development with hot reload)
```bash
docker-compose -f docker-compose-local.yml up --build
# Frontend Vite dev: http://localhost:5173
# Backend Swagger: http://localhost:8000/docs
# PostgreSQL: localhost:5434
```

### Run (Production)
```bash
docker-compose up --build
```

### Database Migrations (inside backend container or with venv)
```bash
alembic upgrade head          # Apply all migrations
alembic revision --autogenerate -m "description"  # Create new migration
```

### Frontend only
```bash
cd frontend && npm run dev    # Vite dev server
cd frontend && npm run build  # Production build
```

## Architecture

### Backend (`/backend`)
- **FastAPI** + **Aiogram 3** (Telegram bot) running in the same process
- **SQLAlchemy async** + **AsyncPG** for PostgreSQL; all DB ops are async
- **Alembic** for migrations in `backend/alembic/versions/`
- **APScheduler** for background jobs (scheduled tasks)
- **Google Cloud Storage** for file uploads (portfolio, videos)
- Entry point: `backend/app/main.py` — sets Telegram webhook on startup

**Layer structure:**
```
app/
├── core/         # Config (settings.py), database session, security (JWT + Telegram HMAC auth), i18n, scheduler
├── models/       # SQLAlchemy ORM models
├── schemas/      # Pydantic v2 schemas
├── services/     # Business logic (one service file per model)
├── api/v1/endpoints/  # FastAPI routers
└── bot/          # Aiogram handlers and keyboards
```

**Key models:** `User`, `Vacancy`, `Resume`, `DailyJobSeeker` (with M2M `works` and `districts`), `Region`, `District`, `Profession`, `ProfessionCategory`, `FavouriteVacancy`, `FavouriteResume`.

**Auth flow:** Frontend sends `X-TG-Init-Data` header → backend verifies HMAC-SHA256 with `BOT_TOKEN` → returns JWT. All protected routes use `get_current_user` dependency.

**API structure:**
```
/api/v1/auth/              # Login via Telegram init data
/api/v1/regions/           # Public
/api/v1/professions/       # Public
/api/v1/vacancies/         # Job listings CRUD
/api/v1/resumes/           # Resume CRUD
/api/v1/daily-job-seekers/ # Daily worker listings CRUD
/api/v1/works/             # Work types (for daily job seekers)
/api/v1/favourite/         # Saved items
/api/v1/analytics/         # Stats
/api/v1/admin/             # Admin-only management
```

### Frontend (`/frontend`)
- **React 19** + **TypeScript** + **Vite**
- **React Router 7** for client-side routing
- **Tailwind CSS** for styling — mobile-first (Telegram Mini App)
- **i18next** for three languages: `uz`, `ru`, `en` (translation files in `src/locales/`)
- **Gemini AI** integration via `src/services/geminiService.ts`

**Key structure:**
```
src/
├── App.tsx          # Router setup and auth initialization
├── types.ts         # All TypeScript interfaces and enums
├── services/        # Axios-based API clients, one per resource
├── views/
│   ├── Onboarding.tsx        # Language & role selection
│   ├── client/               # Main user-facing panel and forms
│   └── admin/                # Admin panel
└── components/      # Reusable cards, modals, layout
```

Auth: reads `window.Telegram.WebApp.initData` → posts to `/api/v1/auth/login` → stores JWT for subsequent requests.

## Environment Variables

Defined in `.env` (see `.env.example`). Key ones:
- `BOT_TOKEN` — Telegram bot token
- `DATABASE_URL` — async PostgreSQL URL (`postgresql+asyncpg://...`)
- `WEBHOOK_URL` — public HTTPS URL for Telegram webhook
- `SECRET_KEY` / `ALGORITHM` — JWT signing
- `REDIS_URL`
- `GCS_BUCKET_NAME`, `GCS_CREDENTIALS_FILE`, `GCS_PUBLIC_BASE_URL` — Google Cloud Storage
- `TELEGRAM_CHANNEL_ID` — channel for auto-publishing
- `GEMINI_API_KEY` — Google Gemini API
- `VITE_API_URL` — frontend API base URL

## Docker Services

| Service | Local port | Purpose |
|---------|-----------|---------|
| `db` | 5434 | PostgreSQL 17 |
| `redis` | — | Redis 7 (caching) |
| `backend` | 8000 | FastAPI + Aiogram |
| `frontend` | 5173 (local) / 3000 (prod) | React app |
| `nginx` | 80 (local only) | Reverse proxy |

## Key Conventions

- All new models should include `created_at`/`updated_at` via the `TimestampMixin` base class.
- Status fields use Python `Enum` classes defined in `app/models/` (e.g., `VacancyStatus`, `ResumeStatus`, `UserRole`).
- Services are async functions taking a `db: AsyncSession` parameter — never commit inside service functions called from endpoints that manage their own transactions.
- Translations for new UI strings must be added to all three locale files: `src/locales/en/translation.json`, `src/locales/ru/translation.json`, `src/locales/uz/translation.json`.
- Admin endpoints are nested under `/api/v1/admin/` and require `is_admin=True` on the user model.
