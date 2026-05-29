-- Migration v4: порог шагов для акций, экономика бонусов

ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS required_steps INTEGER NOT NULL DEFAULT 0;

-- Приветственный бонус был слишком щедрый (50 = 50 000 шагов). Снижаем до 5.
UPDATE promo_codes SET reward_points = 5, description = '5 бонусов за регистрацию (≈ 5 000 шагов).'
WHERE code = 'WELCOME50';

-- FIT100 — убираем награду больше стоимости (экономика 1:1)
UPDATE promo_codes SET reward_points = 100, description = 'Обмен 100 бонусов на промокод партнёра.'
WHERE code = 'FIT100';

-- Салон «Мак»: 20 000 шагов → скидка 10% (партнёр отдаёт 15%, платформе 5%)
INSERT INTO promo_codes (
  code, title, description, kind, partner_name,
  cost_points, reward_points, required_steps,
  discount_percent, user_cashback_percent, platform_fee_percent, active
) VALUES (
  'MAK-SALON-10',
  'Скидка 10% в салоне «Мак»',
  'Пройдите 20 000 шагов и получите скидку 10% на услуги салона красоты «Мак».',
  'partner',
  'Салон красоты «Мак»',
  0, 0, 20000,
  15, 10, 5,
  true
) ON CONFLICT (code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  required_steps = EXCLUDED.required_steps,
  discount_percent = EXCLUDED.discount_percent,
  user_cashback_percent = EXCLUDED.user_cashback_percent,
  platform_fee_percent = EXCLUDED.platform_fee_percent,
  partner_name = EXCLUDED.partner_name;

-- Реферальный бонус: 25 → 10 (≈ 10 000 шагов эквивалент)
UPDATE app_settings SET value = '10' WHERE key = 'referral_bonus';
INSERT INTO app_settings (key, value) VALUES ('referral_bonus', '10') ON CONFLICT (key) DO NOTHING;
