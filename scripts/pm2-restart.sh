#!/usr/bin/env bash
# Безопасный перезапуск: убивает зависший next-server на :3000, затем PM2.
set -euo pipefail
cd /opt/sputnik

if command -v fuser >/dev/null 2>&1; then
  fuser -k 3000/tcp 2>/dev/null || true
  sleep 2
fi

pm2 restart sputnik --update-env || pm2 start npm --name sputnik -- start
pm2 save
