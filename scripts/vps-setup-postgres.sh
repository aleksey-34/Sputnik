#!/usr/bin/env bash
# Установка PostgreSQL и создание БД для Sputnik на Ubuntu/Debian VPS
set -euo pipefail

DB_NAME="${DB_NAME:-sputnik}"
DB_USER="${DB_USER:-sputnik}"
DB_PASSWORD="${DB_PASSWORD:-sputnik_password_change_me}"

echo "==> Установка PostgreSQL..."
apt-get update -qq
apt-get install -y postgresql postgresql-contrib

echo "==> Создание пользователя и базы данных..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

echo ""
echo "Готово! DATABASE_URL для .env:"
echo "DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
echo ""
echo "ВАЖНО: смените пароль DB_PASSWORD перед production!"
