import { db } from "@/lib/drizzle";
import { partner_settlements, promo_codes, promo_redemptions, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function lookupVoucher(token: string) {
  const row = await db.select({
    redemption: promo_redemptions,
    promo: promo_codes,
    user: { first_name: users.first_name, last_name: users.last_name }
  })
    .from(promo_redemptions)
    .innerJoin(promo_codes, eq(promo_redemptions.promo_code_id, promo_codes.id))
    .innerJoin(users, eq(promo_redemptions.user_id, users.id))
    .where(eq(promo_redemptions.voucher_token, token))
    .then(r => r[0]);

  if (!row) return null;

  const expired = row.redemption.expires_at && row.redemption.expires_at.getTime() < Date.now();
  return { ...row, expired };
}

export async function confirmPartnerVoucher(token: string, pin: string) {
  const lookup = await lookupVoucher(token);
  if (!lookup) {
    throw new Error("VOUCHER_NOT_FOUND");
  }

  const { redemption, promo, user, expired } = lookup;

  if (promo.partner_pin && promo.partner_pin !== pin.trim()) {
    throw new Error("INVALID_PIN");
  }

  if (redemption.status === "used") {
    throw new Error("ALREADY_USED");
  }

  if (expired || redemption.status === "expired") {
    throw new Error("EXPIRED");
  }

  const userName = [user.first_name, user.last_name].filter(Boolean).join(" ");

  await db.update(promo_redemptions).set({
    status: "used",
    used_at: sql`now()`
  }).where(eq(promo_redemptions.id, redemption.id));

  await db.insert(partner_settlements).values({
    redemption_id: redemption.id,
    promo_code_id: promo.id,
    partner_name: promo.partner_name ?? promo.title,
    user_name: userName,
    cost_points: redemption.cost_points_snapshot,
    user_discount_percent: redemption.user_discount_snapshot,
    platform_fee_percent: redemption.platform_fee_snapshot,
    total_margin_percent: promo.discount_percent,
    status: "pending",
    meta: { voucher_token: token, promo_code: promo.code }
  });

  return {
    userName,
    discountPercent: redemption.user_discount_snapshot,
    partnerName: promo.partner_name ?? promo.title,
    title: promo.title
  };
}
