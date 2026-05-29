import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { bonus_transactions, promo_codes, promo_redemptions, users } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

function getTelegramId(request: NextRequest) {
  return request.cookies.get("sputnik_telegram_id")?.value ?? null;
}

export async function POST(request: NextRequest) {
  const telegramId = getTelegramId(request);
  if (!telegramId) {
    return new NextResponse("Пользователь не аутентифицирован", { status: 401 });
  }

  const user = await db.select().from(users).where(eq(users.telegram_id, telegramId)).then(rows => rows[0]);
  if (!user) {
    return new NextResponse("Пользователь не найден", { status: 404 });
  }

  const body = await request.json();
  const promoId = Number(body.promoCodeId);
  const promo = await db.select().from(promo_codes).where(eq(promo_codes.id, promoId)).then(rows => rows[0]);
  if (!promo || !promo.active) {
    return new NextResponse("Промокод не найден или недоступен", { status: 404 });
  }

  const already = await db.select().from(promo_redemptions).where(and(eq(promo_redemptions.user_id, user.id), eq(promo_redemptions.promo_code_id, promo.id))).then(rows => rows[0]);
  if (already) {
    return new NextResponse("Промокод уже активирован", { status: 409 });
  }

  const balanceResult = await db.select({ points: sql`coalesce(sum(points), 0)` })
    .from(bonus_transactions)
    .where(eq(bonus_transactions.user_id, user.id));
  const balance = Number(balanceResult[0]?.points ?? 0);

  if (balance < promo.cost_points) {
    return new NextResponse("Недостаточно бонусов", { status: 400 });
  }

  await db.insert(promo_redemptions).values({ user_id: user.id, promo_code_id: promo.id });
  await db.insert(bonus_transactions).values({
    user_id: user.id,
    points: -promo.cost_points,
    type: "promo_redemption",
    source: promo.code,
    meta: { promoId: promo.id }
  });
  if (promo.reward_points > 0) {
    await db.insert(bonus_transactions).values({
      user_id: user.id,
      points: promo.reward_points,
      type: "promo_reward",
      source: promo.code,
      meta: { promoId: promo.id }
    });
  }

  return NextResponse.json({ success: true });
}
