#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# ISHKO'P - Server Setup Script
# Domains:
#   Frontend: webapp.1wash.uz
#   Backend/Webhook: webhookishkop.1wash.uz
# ═══════════════════════════════════════════════════════════════════

set -e

echo "═══ ISHKO'P Server Setup ═══"

# ─── 1. Install dependencies ───────────────────────────────────────
echo ">>> Installing system packages..."
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx python3.12 python3.12-venv python3-pip nodejs npm git postgresql redis-server

# ─── 2. Clone/update repo ─────────────────────────────────────────
echo ">>> Setting up repository..."
REPO_DIR="/var/www/jobboard"

if [ -d "$REPO_DIR" ]; then
    cd $REPO_DIR
    git pull origin main
else
    sudo mkdir -p /var/www
    sudo git clone https://github.com/asrorbekaliqulov/jobboard.git $REPO_DIR
    cd $REPO_DIR
fi

# ─── 3. Backend setup ─────────────────────────────────────────────
echo ">>> Setting up backend..."
cd $REPO_DIR/backend

# Create virtual environment
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Create uploads directory
mkdir -p uploads

# ─── 4. Frontend build ─────────────────────────────────────────────
echo ">>> Building frontend..."
cd $REPO_DIR/frontend
npm install
npm run build

# ─── 5. Nginx configuration ───────────────────────────────────────
echo ">>> Configuring Nginx..."
sudo cp $REPO_DIR/deploy/nginx-webapp.conf /etc/nginx/sites-available/webapp.1wash.uz
sudo cp $REPO_DIR/deploy/nginx-webhook.conf /etc/nginx/sites-available/webhookishkop.1wash.uz

sudo ln -sf /etc/nginx/sites-available/webapp.1wash.uz /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/webhookishkop.1wash.uz /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# ─── 6. SSL Certificates ──────────────────────────────────────────
echo ">>> Getting SSL certificates..."
sudo mkdir -p /var/www/certbot
sudo certbot --nginx -d webapp.1wash.uz -d webhookishkop.1wash.uz --non-interactive --agree-tos --email your-email@example.com || echo "SSL setup may need manual intervention"

# ─── 7. Test Nginx ────────────────────────────────────────────────
echo ">>> Testing Nginx..."
sudo nginx -t && sudo systemctl reload nginx

# ─── 8. Systemd service for backend ───────────────────────────────
echo ">>> Creating systemd service..."
sudo tee /etc/systemd/system/ishkop-backend.service > /dev/null << 'EOF'
[Unit]
Description=ISHKOP Backend (FastAPI + Bot)
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/jobboard/backend
Environment="PATH=/var/www/jobboard/backend/.venv/bin:/usr/bin"
EnvironmentFile=/var/www/jobboard/backend/.env
ExecStart=/var/www/jobboard/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ishkop-backend
sudo systemctl restart ishkop-backend

echo ""
echo "═══ SETUP COMPLETE ═══"
echo ""
echo "Next steps:"
echo "1. Create backend/.env file (see .env.example)"
echo "2. Setup PostgreSQL database"
echo "3. Run migrations: cd backend && alembic upgrade head"
echo "4. Restart: sudo systemctl restart ishkop-backend"
echo ""
echo "Domains:"
echo "  Frontend: https://webapp.1wash.uz"
echo "  Backend:  https://webhookishkop.1wash.uz"
echo ""
