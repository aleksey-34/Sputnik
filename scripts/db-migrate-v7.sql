-- Migration v7: рефералы, убрать ручные шаги, unique invitee

CREATE UNIQUE INDEX IF NOT EXISTS unique_referral_invitee ON referrals(invitee_id);

-- Aleksei → Ариша
INSERT INTO referrals (inviter_id, invitee_id, reward_given)
VALUES (1, 3, true)
ON CONFLICT (invitee_id) DO NOTHING;

INSERT INTO bonus_transactions (user_id, points, type, source, meta)
SELECT 1, COALESCE((SELECT value::int FROM app_settings WHERE key = 'referral_bonus'), 10),
       'referral', 'referral', '{"invitee_id": 3, "backfill": true}'::jsonb
WHERE EXISTS (SELECT 1 FROM referrals WHERE inviter_id = 1 AND invitee_id = 3)
  AND NOT EXISTS (
    SELECT 1 FROM bonus_transactions
    WHERE user_id = 1 AND type = 'referral' AND (meta->>'invitee_id') = '3'
  );

-- Ариша → камилла
INSERT INTO referrals (inviter_id, invitee_id, reward_given)
VALUES (3, 4, true)
ON CONFLICT (invitee_id) DO NOTHING;

INSERT INTO bonus_transactions (user_id, points, type, source, meta)
SELECT 3, COALESCE((SELECT value::int FROM app_settings WHERE key = 'referral_bonus'), 10),
       'referral', 'referral', '{"invitee_id": 4, "backfill": true}'::jsonb
WHERE EXISTS (SELECT 1 FROM referrals WHERE inviter_id = 3 AND invitee_id = 4)
  AND NOT EXISTS (
    SELECT 1 FROM bonus_transactions
    WHERE user_id = 3 AND type = 'referral' AND (meta->>'invitee_id') = '4'
  );

-- Ручные шаги (отключены)
DELETE FROM bonus_transactions WHERE type = 'step' AND source = 'manual';
DELETE FROM steps WHERE source = 'manual';
