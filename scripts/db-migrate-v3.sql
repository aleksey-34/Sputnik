-- Migration v3: partner promos, kinds, discount splits

ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS kind VARCHAR(32) NOT NULL DEFAULT 'bonus_shop';
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS partner_name VARCHAR(128);
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS discount_percent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS user_cashback_percent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS platform_fee_percent INTEGER NOT NULL DEFAULT 0;

UPDATE promo_codes SET kind = 'bonus_shop' WHERE kind IS NULL OR kind = '';

INSERT INTO promo_codes (code, title, description, cost_points, reward_points, active, kind, partner_name, discount_percent, user_cashback_percent, platform_fee_percent)
VALUES
  ('PARTNER-DEMO', 'Скидка 15% у партнёра', 'Пример партнёрской акции: скидка 15%, вам 10%, платформе 5%.', 50, 0, true, 'partner', 'Demo Partner', 15, 10, 5),
  ('QUEST-WALK7', 'Квест: 7 дней ходьбы', 'Синхронизируйте шаги 7 дней подряд и получите бонус.', 0, 30, true, 'quest', NULL, 0, 0, 0)
ON CONFLICT (code) DO NOTHING;
