import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { db } from "@/lib/drizzle";
import {
  partner_event_logs,
  partner_settlements,
  promo_codes,
  promo_redemptions,
  users
} from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const rows = await db.select({
    id: promo_redemptions.id,
    redeemed_at: promo_redemptions.redeemed_at,
    used_at: promo_redemptions.used_at,
    status: promo_redemptions.status,
    voucher_token: promo_redemptions.voucher_token,
    cost_points: promo_redemptions.cost_points_snapshot,
    user_discount_percent: promo_redemptions.user_discount_snapshot,
    partner_name_snapshot: promo_redemptions.partner_name_snapshot,
    user_id: users.id,
    user_name: users.first_name,
    username: users.username,
    promo_code: promo_codes.code,
    promo_title: promo_codes.title,
    promo_kind: promo_codes.kind,
    settlement_id: partner_settlements.id,
    bill_amount_rub: partner_settlements.bill_amount_rub,
    discount_amount_rub: partner_settlements.discount_amount_rub,
    platform_fee_amount_rub: partner_settlements.platform_fee_amount_rub,
    client_pays_rub: partner_settlements.client_pays_rub,
    settlement_status: partner_settlements.status,
    confirmed_at: partner_settlements.confirmed_at
  })
    .from(promo_redemptions)
    .innerJoin(users, eq(promo_redemptions.user_id, users.id))
    .innerJoin(promo_codes, eq(promo_redemptions.promo_code_id, promo_codes.id))
    .leftJoin(partner_settlements, eq(partner_settlements.redemption_id, promo_redemptions.id))
    .orderBy(sql`${promo_redemptions.redeemed_at} DESC`)
    .limit(300);

  const [summary] = await db.select({
    totalActivations: sql<number>`count(*)`,
    activeVouchers: sql<number>`count(*) filter (where ${promo_redemptions.status} = 'active')`,
    usedVouchers: sql<number>`count(*) filter (where ${promo_redemptions.status} = 'used')`,
    totalBillRub: sql<number>`coalesce(sum(${partner_settlements.bill_amount_rub}), 0)`,
    totalDiscountRub: sql<number>`coalesce(sum(${partner_settlements.discount_amount_rub}), 0)`,
    totalPlatformFeeRub: sql<number>`coalesce(sum(${partner_settlements.platform_fee_amount_rub}), 0)`,
    totalClientPaysRub: sql<number>`coalesce(sum(${partner_settlements.client_pays_rub}), 0)`,
    totalBonusesSpent: sql<number>`coalesce(sum(${promo_redemptions.cost_points_snapshot}), 0)`
  })
    .from(promo_redemptions)
    .leftJoin(partner_settlements, eq(partner_settlements.redemption_id, promo_redemptions.id));

  const recentEvents = await db.select({
    id: partner_event_logs.id,
    event: partner_event_logs.event,
    status: partner_event_logs.status,
    partner_name: partner_event_logs.partner_name,
    meta: partner_event_logs.meta,
    created_at: partner_event_logs.created_at,
    user_id: partner_event_logs.user_id
  })
    .from(partner_event_logs)
    .orderBy(sql`${partner_event_logs.created_at} DESC`)
    .limit(50);

  return NextResponse.json({ summary, redemptions: rows, recentEvents });
}
