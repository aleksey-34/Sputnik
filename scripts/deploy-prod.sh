#!/usr/bin/env bash
# Деплой на VPS: rsync → миграции → build → pm2 restart
set -euo pipefail

VPS="${VPS:-root@176.57.184.98}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/btdd_vps}"
REMOTE_DIR="${REMOTE_DIR:-/opt/sputnik}"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

RSYNC_SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=no"

echo "→ rsync $LOCAL_DIR → $VPS:$REMOTE_DIR"
rsync -avz --delete \
  --exclude node_modules --exclude .next --exclude .git --exclude .env \
  -e "$RSYNC_SSH" \
  "$LOCAL_DIR/" "$VPS:$REMOTE_DIR/"

echo "→ migrate + build + restart on VPS"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$VPS" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/sputnik
source .env

for f in scripts/db-migrate-v10.sql; do
  if [[ -f "$f" ]]; then
    echo "  psql $f"
    psql "$DATABASE_URL" -f "$f" || true
  fi
done

npm ci 2>/dev/null || npm install
npm run build
bash scripts/pm2-restart.sh
echo "✓ deploy done"
REMOTE
