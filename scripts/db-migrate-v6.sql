-- Migration v6: welcome_bonus в настройках, корректировка старых приветственных начислений

INSERT INTO app_settings (key, value)
SELECT 'welcome_bonus', reward_points::text FROM promo_codes WHERE code = 'WELCOME50'
ON CONFLICT (key) DO NOTHING;

-- Старые пользователи получали 50 бонусов по WELCOME50 — приводим к текущему значению (5)
UPDATE bonus_transactions SET points = 5
WHERE type = 'promo_reward' AND source = 'WELCOME50' AND points = 50;

-- Ирина и другие с избыточным балансом только от welcome: если баланс > welcome и единственная транзакция welcome 50→5 уже поправлена, ок.
-- Дополнительно: пользователи с именем Ирина, у кого баланс 50 и одна welcome-транзакция
UPDATE bonus_transactions bt SET points = (
  SELECT COALESCE(value::int, 5) FROM app_settings WHERE key = 'welcome_bonus'
)
FROM users u
WHERE bt.user_id = u.id
  AND u.first_name ILIKE 'Ирина%'
  AND bt.type = 'promo_reward'
  AND bt.source = 'WELCOME50'
  AND bt.points > (SELECT COALESCE(value::int, 5) FROM app_settings WHERE key = 'welcome_bonus');
