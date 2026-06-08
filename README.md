# 🚀 Telegram Job Board Mini App

A full-stack job marketplace platform built as a **Telegram Mini App**. This project integrates a high-performance **FastAPI** backend with a modern **React** frontend, providing a seamless experience for posting vacancies and submitting resumes directly within Telegram.

## 🛠 Tech Stack

| Component | Technology |
| --- | --- |
| **Backend** | Python, FastAPI, Aiogram (Telegram Bot API), SQLModel/SQLAlchemy |
| **Frontend** | React (Vite), TypeScript, TanStack Query, Axios |
| **Database** | PostgreSQL |
| **DevOps** | Docker, Docker Compose, Nginx, Alembic (Migrations) |

---

## 📂 Project Structure

The repository is organized as a monorepo for ease of deployment and synchronized development:

```text
jobboard/
├── backend/                # FastAPI + Aiogram logic
│   ├── app/
│   │   ├── api/            # REST Endpoints (Mini App communication)
│   │   ├── bot/            # Telegram Bot handlers, keyboards, and logic
│   │   ├── core/           # Security (JWT), Config, and Env management
│   │   ├── models/         # Database models (SQLModel)
│   │   └── schemas/         # Pydantic validation schemas
│   ├── alembic/            # Database migration scripts
│   └── main.py             # Entry point (FastAPI + Bot Startup)
├── frontend/               # React (Vite) Mini App
│   ├── src/
│   │   ├── api/            # API client setup (Axios/Query)
│   │   ├── hooks/          # Custom hooks (e.g., Telegram WebApp SDK)
│   │   └── pages/          # Application screens (Dashboard, Vacancies)
├── nginx/                  # Reverse proxy configuration
└── docker-compose.yml      # Orchestration for all services

```

---

## 🐳 Containerization Strategy

We utilize Docker Compose to manage the lifecycle of our services. The environment is split into two primary configurations:

### ⚙️ Development Mode

Uses `docker-compose-local.yml` and `Dockerfile.local`.

* **Hot Reloading:** Enabled for both Backend and Frontend.
* **Direct Debugging:** Simplified logs and easy access to the database.

### 🌐 Production Mode

Uses `docker-compose.yml` and standard `Dockerfile`.

* **Optimized Build:** Frontend is compiled and served via Nginx.
* **Security:** Production-ready Uvicorn settings and environment hardening.

> [!IMPORTANT]
> The Backend container serves a dual purpose: it runs the **FastAPI web server** for the Mini App and maintains the **Aiogram Webhook listener** to handle Telegram interactions simultaneously.

---

## 🚀 Getting Started

1. **Clone the repository:**
```bash
git clone https://github.com/your-username/jobboard.git
cd jobboard

```


2. **Configure Environment Variables:**
Copy the `.env.example` (if available) to `.env` and fill in your `BOT_TOKEN` and database credentials.
3. **Launch the Development Environment:**
```bash
docker-compose -f docker-compose-local.yml up --build

```


4. **Access the Services:**
* **Frontend:** `http://localhost:5173`
* **Backend API:** `http://localhost:8000/docs`



---

## 🛣 Roadmap

* [ ] Implement Resume PDF generation.
* [ ] Add Employer verification badges.
* [ ] Real-time notifications for job applications.

Would you like me to help you draft the `.env.example` file or create a basic `CONTRIBUTING.md` to go along with this?# jobboard
