#!/usr/bin/env bash
# Полный деплой Sputnik на VPS в /opt/sputnik
set -euo pipefail

REPO_URL="${1:-}"
PROJECT_DIR="/opt/sputnik"
SERVICE_USER="${SUDO_USER:-root}"

if [[ -z "$REPO_URL" ]]; then
  echo "Использование: sudo bash scripts/vps-deploy.sh <git-repo-url>"
  echo "Пример: sudo bash scripts/vps-deploy.sh git@github.com:aleksey-34/sputnik.git"
  exit 1
fi

if [[ "$EUID" -ne 0 ]]; then
  echo "Запустите от root: sudo bash scripts/vps-deploy.sh <url>"
  exit 1
fi

echo "==> Установка Node.js 20 (если нет)..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> Установка PM2..."
npm install -g pm2 2>/dev/null || true

mkdir -p "$PROJECT_DIR"
if [[ "$SERVICE_USER" != "root" ]]; then
  chown "$SERVICE_USER":"$SERVICE_USER" "$PROJECT_DIR"
fi
cd "$PROJECT_DIR"

run_as_user() {
  if [[ "$SERVICE_USER" != "root" ]]; then
    sudo -u "$SERVICE_USER" "$@"
  else
    "$@"
  fi
}

if [[ -d .git ]]; then
  echo "==> Обновление репозитория..."
  run_as_user git pull origin main
else
  echo "==> Клонирование репозитория..."
  run_as_user git clone "$REPO_URL" .
fi

echo "==> Установка зависимостей..."
run_as_user npm ci 2>/dev/null || run_as_user npm install

if [[ ! -f .env ]]; then
  run_as_user cp .env.example .env
  echo "Создан .env из .env.example — отредактируйте перед запуском!"
fi

set +u
if [[ -f .env ]]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi
set -u

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "==> Инициализация БД..."
  run_as_user psql "$DATABASE_URL" -f scripts/db-init.sql || echo "БД уже инициализирована или psql недоступен"
fi

echo "==> Сборка..."
run_as_user npm run build

echo "==> Запуск через PM2..."
if [[ "$SERVICE_USER" != "root" ]]; then
  sudo -u "$SERVICE_USER" pm2 delete sputnik 2>/dev/null || true
  sudo -u "$SERVICE_USER" pm2 start npm --name sputnik -- start
  sudo -u "$SERVICE_USER" pm2 save
else
  pm2 delete sputnik 2>/dev/null || true
  pm2 start npm --name sputnik -- start
  pm2 save
fi

echo ""
echo "============================================"
echo " Sputnik развёрнут в ${PROJECT_DIR}"
echo "============================================"
echo "1. Отредактируйте .env: nano ${PROJECT_DIR}/.env"
echo "2. Перезапустите: pm2 restart sputnik"
echo "3. Настройте nginx reverse proxy на порт ${PORT:-3000}"
echo "4. Логи: pm2 logs sputnik"
