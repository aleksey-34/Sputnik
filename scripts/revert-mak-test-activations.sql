-- Откат пробных активаций MAK-SALON-10 (Ирина, Алексей/Aleksei)
-- Возвращает бонусы и удаляет redemption (+ settlement через CASCADE)
-- Перед COMMIT проверьте SELECT в блоке preview

BEGIN;

-- PREVIEW (раскомментируйте для проверки):
-- SELECT pr.id, u.first_name, pc.code, pr.status, pr.cost_points_snapshot, pr.redeemed_at, ps.bill_amount_rub
-- FROM promo_redemptions pr
-- JOIN users u ON u.id = pr.user_id
-- JOIN promo_codes pc ON pc.id = pr.promo_code_id
-- LEFT JOIN partner_settlements ps ON ps.redemption_id = pr.id
-- WHERE pc.code = 'MAK-SALON-10'
--   AND (u.first_name ILIKE 'Ирина%' OR u.first_name ILIKE 'Алекс%' OR u.first_name ILIKE 'Aleksei%');

WITH targets AS (
  SELECT pr.id AS redemption_id, pr.user_id, pr.cost_points_snapshot
  FROM promo_redemptions pr
  JOIN users u ON u.id = pr.user_id
  JOIN promo_codes pc ON pc.id = pr.promo_code_id
  WHERE pc.code = 'MAK-SALON-10'
    AND (
      u.first_name ILIKE 'Ирина%'
      OR u.first_name ILIKE 'Алекс%'
      OR u.first_name ILIKE 'Aleksei%'
    )
)
INSERT INTO bonus_transactions (user_id, points, type, source, meta)
SELECT
  t.user_id,
  t.cost_points_snapshot,
  'admin_adjustment',
  'MAK-SALON-10-revert',
  jsonb_build_object('reason', 'Revert test MAK activation', 'redemption_id', t.redemption_id)
FROM targets t
WHERE t.cost_points_snapshot > 0;

WITH targets AS (
  SELECT pr.id AS redemption_id
  FROM promo_redemptions pr
  JOIN users u ON u.id = pr.user_id
  JOIN promo_codes pc ON pc.id = pr.promo_code_id
  WHERE pc.code = 'MAK-SALON-10'
    AND (
      u.first_name ILIKE 'Ирина%'
      OR u.first_name ILIKE 'Алекс%'
      OR u.first_name ILIKE 'Aleksei%'
    )
)
DELETE FROM promo_redemptions
WHERE id IN (SELECT redemption_id FROM targets);

COMMIT;
