# ISHKO'P Deployment Guide

## Domains
- **Frontend (WebApp):** `https://webapp.1wash.uz`
- **Backend (Webhook + API):** `https://webhookishkop.1wash.uz`

## Quick Setup

### 1. SSH ga ulanib scriptni ishga tushiring:
```bash
ssh root@your-server-ip
curl -fsSL https://raw.githubusercontent.com/asrorbekaliqulov/jobboard/main/deploy/setup.sh | bash
```

### 2. Yoki qo'lda:

```bash
# Repo clone
cd /var/www
git clone https://github.com/asrorbekaliqulov/jobboard.git
cd jobboard

# Backend
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
mkdir -p uploads
cp ../deploy/.env.production .env
# .env ni to'ldiring!

# Database
sudo -u postgres createuser ishkop_user -P
sudo -u postgres createdb ishkop_db -O ishkop_user
alembic upgrade head

# Frontend
cd ../frontend
echo "VITE_API_URL=" > .env
echo "VITE_TELEGRAM_BOT_NAME=YourBotName" >> .env
npm install
npm run build
```

### 3. Nginx + SSL:
```bash
# Nginx config nusxalash
sudo cp deploy/nginx-webapp.conf /etc/nginx/sites-available/webapp.1wash.uz
sudo cp deploy/nginx-webhook.conf /etc/nginx/sites-available/webhookishkop.1wash.uz
sudo ln -sf /etc/nginx/sites-available/webapp.1wash.uz /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/webhookishkop.1wash.uz /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# SSL olish (DNS propagation bo'lganidan keyin)
sudo certbot --nginx -d webapp.1wash.uz -d webhookishkop.1wash.uz

# Test va reload
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Backend service:
```bash
# Systemd service yaratish
sudo cp deploy/ishkop-backend.service /etc/systemd/system/ # yoki setup.sh dan
sudo systemctl daemon-reload
sudo systemctl enable ishkop-backend
sudo systemctl start ishkop-backend

# Loglarni ko'rish
sudo journalctl -u ishkop-backend -f
```

### 5. BotFather sozlamalar:
1. `/mybots` → botingiz → **Bot Settings** → **Domain**
2. Domain qo'shing: `webapp.1wash.uz`
3. **Menu Button** → URL: `https://webapp.1wash.uz`

## .env sozlamalari

### Backend (`/var/www/jobboard/backend/.env`):
```env
BOT_TOKEN=7700885764:AAFhc5ZL0rv2j4mMPYEescZ-KqHM3ZrI51Q
WEBHOOK_URL=https://webhookishkop.1wash.uz/webhook
MINI_APP_URL=https://webapp.1wash.uz
DATABASE_URL=postgresql+asyncpg://ishkop_user:password@localhost:5432/ishkop_db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-super-secret-random-key
ALGORITHM=HS256
```

### Frontend (`/var/www/jobboard/frontend/.env`):
```env
VITE_API_URL=
VITE_TELEGRAM_BOT_NAME=DarsuchunTestBot
```

> `VITE_API_URL` bo'sh = same origin (Nginx proxy orqali ishlaydi)

## Foydali buyruqlar

```bash
# Backend restart
sudo systemctl restart ishkop-backend

# Backend log
sudo journalctl -u ishkop-backend -f

# Nginx restart
sudo systemctl reload nginx

# SSL yangilash (auto cron bilan)
sudo certbot renew

# Database migration
cd /var/www/jobboard/backend
source .venv/bin/activate
alembic upgrade head

# Frontend rebuild
cd /var/www/jobboard/frontend
npm run build
```

## Architecture

```
                    ┌─────────────────┐
                    │   Telegram API   │
                    └────────┬────────┘
                             │ webhook POST
                             ▼
┌──────────────────────────────────────────────────┐
│              Nginx (webhookishkop.1wash.uz)       │
│              SSL termination + proxy              │
└────────────────────────┬─────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────┐
│         FastAPI Backend (:8000)                   │
│         - Bot handlers (polling/webhook)          │
│         - REST API (/api/v1/...)                  │
│         - File serving (/uploads/...)             │
└────────────┬───────────────────────┬─────────────┘
             │                       │
             ▼                       ▼
      ┌─────────────┐        ┌─────────────┐
      │ PostgreSQL   │        │    Redis     │
      │ (Database)   │        │   (Cache)    │
      └─────────────┘        └─────────────┘

┌──────────────────────────────────────────────────┐
│              Nginx (webapp.1wash.uz)              │
│              SSL + static files + API proxy       │
└──────────────────────────────────────────────────┘
│  /           → Frontend static (dist/src/)        │
│  /api/       → Proxy to :8000                     │
│  /uploads/   → Proxy to :8000                     │
└──────────────────────────────────────────────────┘
```
