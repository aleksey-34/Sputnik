import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { promo_codes, promo_redemptions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { partnerVoucherUrl } from "@/lib/server/voucher";

function getTelegramId(request: NextRequest) {
  return request.cookies.get("sputnik_telegram_id")?.value ?? null;
}

export async function GET(request: NextRequest) {
  const telegramId = getTelegramId(request);
  if (!telegramId) {
    return new NextResponse("Пользователь не аутентифицирован", { status: 401 });
  }

  const user = await db.select().from(users).where(eq(users.telegram_id, telegramId)).then(r => r[0]);
  if (!user) {
    return new NextResponse("Пользователь не найден", { status: 404 });
  }

  const rows = await db.select({
    promo: promo_codes,
    redemption: promo_redemptions
  })
    .from(promo_redemptions)
    .innerJoin(promo_codes, eq(promo_redemptions.promo_code_id, promo_codes.id))
    .where(eq(promo_redemptions.user_id, user.id));

  const result = rows.map(({ promo, redemption }) => ({
    ...promo,
    redeemed_at: redemption.redeemed_at,
    voucher_token: redemption.voucher_token,
    voucher_url: redemption.voucher_token ? partnerVoucherUrl(redemption.voucher_token) : null,
    status: redemption.status,
    used_at: redemption.used_at,
    expires_at: redemption.expires_at,
    user_discount_percent: redemption.user_discount_snapshot || promo.user_cashback_percent
  }));

  return NextResponse.json(result);
}
