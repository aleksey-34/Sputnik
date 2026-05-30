-- Журнал партнёрских событий (активация QR, скан, ошибки)
CREATE TABLE IF NOT EXISTS partner_event_logs (
  id SERIAL PRIMARY KEY,
  event VARCHAR(64) NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  redemption_id INTEGER,
  promo_code_id INTEGER,
  partner_name VARCHAR(128),
  status VARCHAR(16) NOT NULL DEFAULT 'ok',
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_event_logs_created ON partner_event_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_event_logs_user ON partner_event_logs(user_id, created_at DESC);
