-- Migration v8: партнёрские ваучеры с QR, PIN партнёра, учёт долгов

ALTER TABLE promo_redemptions ADD COLUMN IF NOT EXISTS voucher_token VARCHAR(64) UNIQUE;
ALTER TABLE promo_redemptions ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'active';
ALTER TABLE promo_redemptions ADD COLUMN IF NOT EXISTS used_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE promo_redemptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE promo_redemptions ADD COLUMN IF NOT EXISTS cost_points_snapshot INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promo_redemptions ADD COLUMN IF NOT EXISTS user_discount_snapshot INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promo_redemptions ADD COLUMN IF NOT EXISTS platform_fee_snapshot INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promo_redemptions ADD COLUMN IF NOT EXISTS partner_name_snapshot VARCHAR(128);

ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS partner_pin VARCHAR(32);

CREATE TABLE IF NOT EXISTS partner_settlements (
  id SERIAL PRIMARY KEY,
  redemption_id INTEGER NOT NULL UNIQUE REFERENCES promo_redemptions(id) ON DELETE CASCADE,
  promo_code_id INTEGER NOT NULL REFERENCES promo_codes(id),
  partner_name VARCHAR(128) NOT NULL,
  user_name VARCHAR(128) NOT NULL,
  cost_points INTEGER NOT NULL DEFAULT 0,
  user_discount_percent INTEGER NOT NULL DEFAULT 0,
  platform_fee_percent INTEGER NOT NULL DEFAULT 0,
  total_margin_percent INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  meta JSONB
);

-- PIN для салона «Мак» (можно сменить в админке)
UPDATE promo_codes SET partner_pin = 'MAK2026' WHERE code = 'MAK-SALON-10' AND partner_pin IS NULL;
