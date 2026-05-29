-- Migration v2: Google Fit tokens, sync logs, app settings

CREATE TABLE IF NOT EXISTS google_fit_connections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS step_sync_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(32) NOT NULL,
  period VARCHAR(16) NOT NULL,
  date_from VARCHAR(10) NOT NULL,
  date_to VARCHAR(10) NOT NULL,
  days_synced INTEGER NOT NULL DEFAULT 0,
  steps_synced INTEGER NOT NULL DEFAULT 0,
  bonus_awarded INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'success',
  meta JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(64) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

INSERT INTO app_settings (key, value) VALUES
  ('steps_per_bonus', '1000'),
  ('referral_bonus', '25')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_step_sync_logs_user ON step_sync_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_step_sync_logs_created ON step_sync_logs(created_at DESC);
