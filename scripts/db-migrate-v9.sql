-- Migration v9: сумма чека в партнёрских settlements

ALTER TABLE partner_settlements ADD COLUMN IF NOT EXISTS bill_amount_rub INTEGER NOT NULL DEFAULT 0;
ALTER TABLE partner_settlements ADD COLUMN IF NOT EXISTS discount_amount_rub INTEGER NOT NULL DEFAULT 0;
ALTER TABLE partner_settlements ADD COLUMN IF NOT EXISTS platform_fee_amount_rub INTEGER NOT NULL DEFAULT 0;
ALTER TABLE partner_settlements ADD COLUMN IF NOT EXISTS client_pays_rub INTEGER NOT NULL DEFAULT 0;
