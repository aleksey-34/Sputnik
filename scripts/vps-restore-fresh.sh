#!/usr/bin/env bash
# Полное восстановление Sputnik на чистом VPS (после переустановки).
# Запуск на сервере от root:
#   export TELEGRAM_BOT_TOKEN='...'
#   export GOOGLE_CLIENT_ID='...'      # опционально
#   export GOOGLE_CLIENT_SECRET='...'  # опционально
#   bash scripts/vps-restore-fresh.sh
#
# Или с локальной машины (если SSH работает):
#   ssh root@176.57.184.98 'bash -s' < scripts/vps-restore-fresh.sh
set -euo pipefail

PROJECT_DIR="/opt/sputnik"
REPO_URL="${REPO_URL:-https://github.com/aleksey-34/Sputnik.git}"
DOMAIN="${DOMAIN:-sputnik.battletoads.top}"
DB_NAME="${DB_NAME:-sputnik}"
DB_USER="${DB_USER:-sputnik}"
DB_PASS="${DB_PASS:-sputnik_$(openssl rand -hex 8)}"
ADMIN_KEY="${ADMIN_API_KEY:-$(openssl rand -hex 16)}"
TELEGRAM_TOKEN="${TELEGRAM_BOT_TOKEN:-8901039724:AAHbaPoD5nvlfKRH2ox9f84TbuclxPAV-To}"
GOOGLE_ID="${GOOGLE_CLIENT_ID:-554978103939-1e5e8474rs6mc8s2vj3bs5m23a25s8cj.apps.googleusercontent.com}"
GOOGLE_SECRET="${GOOGLE_CLIENT_SECRET:-}"
APP_URL="${APP_URL:-https://${DOMAIN}}"

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Запустите от root: sudo bash $0"
  exit 1
fi

echo "==> Базовые пакеты..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y curl git nginx postgresql postgresql-contrib ufw \
  build-essential ca-certificates gnupg

echo "==> Node.js 20..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> PM2..."
npm install -g pm2 2>/dev/null || true

echo "==> PostgreSQL..."
systemctl enable postgresql
systemctl start postgresql
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

echo "==> Firewall (SSH + web)..."
ufw --force reset >/dev/null 2>&1 || true
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Клонирование репозитория..."
mkdir -p "$PROJECT_DIR"
if [[ -d "$PROJECT_DIR/.git" ]]; then
  cd "$PROJECT_DIR"
  git fetch origin
  git reset --hard origin/main
else
  git clone "$REPO_URL" "$PROJECT_DIR"
  cd "$PROJECT_DIR"
fi

echo "==> .env..."
cat > "$PROJECT_DIR/.env" <<ENV
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}
APP_URL=${APP_URL}
TELEGRAM_BOT_TOKEN=${TELEGRAM_TOKEN}
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=WeGoWithSputnik_bot
GOOGLE_CLIENT_ID=${GOOGLE_ID}
GOOGLE_CLIENT_SECRET=${GOOGLE_SECRET}
GOOGLE_REDIRECT_URL=${APP_URL}/api/google-fit/callback
ADMIN_API_KEY=${ADMIN_KEY}
PORT=3000
NODE_ENV=production
ENV
chmod 600 "$PROJECT_DIR/.env"

echo "==> Зависимости и сборка..."
cd "$PROJECT_DIR"
npm ci 2>/dev/null || npm install

echo "==> Миграции БД..."
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
psql "$DATABASE_URL" -f scripts/db-init.sql || true
for f in scripts/db-migrate-v{2,3,4,5,6,7,8,9,10}.sql; do
  if [[ -f "$f" ]]; then
    echo "  → $f"
    psql "$DATABASE_URL" -f "$f" || true
  fi
done

npm run build

echo "==> PM2..."
pm2 delete sputnik 2>/dev/null || true
cd "$PROJECT_DIR"
pm2 start npm --name sputnik -- start
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null | tail -1 | bash || true

echo "==> SSH keys для деплоя..."
mkdir -p /root/.ssh
chmod 700 /root/.ssh
DEPLOY_PUBKEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOc/M87+CGrIQUhlbLyWCauEWid0J8L/k7abdUaqlU+A btdd-vps"
DEV_PUBKEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIBG/WSC9+6J7lAPcElKIKbu4wqIH7d+Xkiy/8Lu4Y4Yc aleksei-local-vps"
touch /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
grep -qF "$DEPLOY_PUBKEY" /root/.ssh/authorized_keys 2>/dev/null || echo "$DEPLOY_PUBKEY" >> /root/.ssh/authorized_keys
grep -qF "$DEV_PUBKEY" /root/.ssh/authorized_keys 2>/dev/null || echo "$DEV_PUBKEY" >> /root/.ssh/authorized_keys

echo "==> Nginx..."
CF_CERT="/etc/ssl/cloudflare/origin.pem"
CF_KEY="/etc/ssl/cloudflare/origin.key"

if [[ -f "$CF_CERT" && -f "$CF_KEY" ]]; then
  cat > /etc/nginx/sites-available/sputnik.conf <<NGINX
server {
  listen 80;
  server_name ${DOMAIN};
  return 301 https://\$host\$request_uri;
}
server {
  listen 443 ssl http2;
  server_name ${DOMAIN};
  ssl_certificate     ${CF_CERT};
  ssl_certificate_key ${CF_KEY};
  ssl_protocols       TLSv1.2 TLSv1.3;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
  }
}
NGINX
else
  echo "  Cloudflare origin cert не найден — nginx только HTTP :80"
  echo "  (Cloudflare SSL mode: Flexible, или положите cert в ${CF_CERT})"
  cat > /etc/nginx/sites-available/sputnik.conf <<NGINX
server {
  listen 80;
  server_name ${DOMAIN};
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
  }
}
NGINX
fi

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/sputnik.conf /etc/nginx/sites-enabled/sputnik.conf
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "==> SSH deploy key (для git pull)..."
if [[ ! -f /root/.ssh/id_ed25519 ]]; then
  ssh-keygen -t ed25519 -N "" -f /root/.ssh/id_ed25519 -q
  echo "  Deploy key для GitHub (если нужен git pull по SSH):"
  cat /root/.ssh/id_ed25519.pub
fi

echo "==> Telegram webhook + menu..."
set +u
source "$PROJECT_DIR/.env"
set -u
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d "{\"menu_button\":{\"type\":\"web_app\",\"text\":\"Открыть Спутник\",\"web_app\":{\"url\":\"${APP_URL}\"}}}" || true
curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${APP_URL}/api/telegram/webhook\",\"allowed_updates\":[\"message\"]}" || true

sleep 3
echo ""
echo "============================================"
echo " RESTORE OK"
echo "============================================"
curl -s -o /dev/null -w "app localhost: %{http_code}\n" http://127.0.0.1:3000/ || true
curl -s -o /dev/null -w "nginx :80:     %{http_code}\n" -H "Host: ${DOMAIN}" http://127.0.0.1/ || true
echo ""
echo "DOMAIN=${DOMAIN}"
echo "ADMIN_API_KEY=${ADMIN_KEY}"
echo "DB_PASS=${DB_PASS}"
echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}"
if [[ -z "${GOOGLE_SECRET}" ]]; then
  echo ""
  echo "⚠ GOOGLE_CLIENT_SECRET пуст — допишите в /opt/sputnik/.env и: pm2 restart sputnik --update-env"
fi
if [[ ! -f "$CF_CERT" ]]; then
  echo ""
  echo "⚠ Нет Cloudflare origin cert — в Cloudflare: SSL/TLS → Flexible"
  echo "  или SSL/TLS Origin Server → Create → положить в ${CF_CERT} и ${CF_KEY}"
fi
echo ""
echo "Админка: ${APP_URL}/admin  (ключ: ADMIN_API_KEY выше)"
pm2 list
