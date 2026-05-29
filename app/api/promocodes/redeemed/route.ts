import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { promo_codes, promo_redemptions, users } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";

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

  const redemptions = await db.select({
    promo_code_id: promo_redemptions.promo_code_id,
    redeemed_at: promo_redemptions.redeemed_at
  }).from(promo_redemptions).where(eq(promo_redemptions.user_id, user.id));

  if (redemptions.length === 0) {
    return NextResponse.json([]);
  }

  const ids = redemptions.map(r => r.promo_code_id);
  const promos = await db.select().from(promo_codes).where(inArray(promo_codes.id, ids));

  const result = promos.map(p => {
    const r = redemptions.find(x => x.promo_code_id === p.id);
    return {
      ...p,
      redeemed_at: r?.redeemed_at
    };
  });

  return NextResponse.json(result);
}
