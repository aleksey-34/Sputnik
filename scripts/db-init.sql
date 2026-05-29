-- Sputnik Mini App SQL initialization

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id VARCHAR(64) NOT NULL UNIQUE,
  first_name VARCHAR(128) NOT NULL,
  last_name VARCHAR(128),
  username VARCHAR(64),
  avatar_url TEXT,
  gender VARCHAR(16),
  birth_year INTEGER,
  height_cm INTEGER,
  weight_kg INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS steps (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source VARCHAR(32) NOT NULL,
  date VARCHAR(10) NOT NULL,
  step_count INTEGER NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT unique_step_entry UNIQUE (user_id, source, date)
);

CREATE TABLE IF NOT EXISTS bonus_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  type VARCHAR(32) NOT NULL,
  source VARCHAR(64),
  meta JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  title VARCHAR(128) NOT NULL,
  description TEXT,
  cost_points INTEGER NOT NULL DEFAULT 0,
  reward_points INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS promo_redemptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  promo_code_id INTEGER NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  CONSTRAINT unique_redemption UNIQUE (user_id, promo_code_id)
);

CREATE TABLE IF NOT EXISTS referrals (
  id SERIAL PRIMARY KEY,
  inviter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  reward_given BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO promo_codes (code, title, description, cost_points, reward_points, active)
VALUES
  ('WELCOME50', 'Приветственные бонусы', 'Получите 50 очков за активацию.', 0, 50, true),
  ('FIT100', 'Фитнес-промокод', 'Обменяйте 100 бонусов на 120.', 100, 120, true)
ON CONFLICT (code) DO NOTHING;
