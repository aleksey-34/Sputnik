import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { bonus_transactions, promo_codes, promo_redemptions, users } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { generateVoucherToken, isPartnerKind, partnerVoucherUrl, voucherExpiresAt } from "@/lib/server/voucher";

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
  const confirmed = Boolean(body.confirmed);
  const promo = await db.select().from(promo_codes).where(eq(promo_codes.id, promoId)).then(rows => rows[0]);
  if (!promo || !promo.active) {
    return new NextResponse("Промокод не найден или недоступен", { status: 404 });
  }

  const already = await db.select().from(promo_redemptions)
    .where(and(eq(promo_redemptions.user_id, user.id), eq(promo_redemptions.promo_code_id, promo.id)))
    .then(rows => rows[0]);
  if (already) {
    const voucherUrl = already.voucher_token ? partnerVoucherUrl(already.voucher_token) : null;
    return NextResponse.json({
      alreadyRedeemed: true,
      code: promo.code,
      title: promo.title,
      kind: promo.kind,
      voucher_token: already.voucher_token,
      voucher_url: voucherUrl,
      status: already.status,
      user_discount_percent: already.user_discount_snapshot || promo.user_cashback_percent,
      partner_name: already.partner_name_snapshot || promo.partner_name,
      message: already.status === "used"
        ? "Акция уже использована у партнёра"
        : "Акция уже активирована — покажите QR сотруднику"
    });
  }

  const balanceResult = await db.select({ points: sql<number>`coalesce(sum(points), 0)` })
    .from(bonus_transactions)
    .where(eq(bonus_transactions.user_id, user.id));
  const balance = Number(balanceResult[0]?.points ?? 0);

  if (balance < promo.cost_points) {
    return NextResponse.json({
      error: "INSUFFICIENT_BONUS",
      balance,
      cost: promo.cost_points,
      message: `Нужно ${promo.cost_points} бонусов. У вас: ${balance}`
    }, { status: 400 });
  }

  const needsConfirm = isPartnerKind(promo.kind) && promo.cost_points > 0;
  if (needsConfirm && !confirmed) {
    return NextResponse.json({
      needsConfirmation: true,
      promoCodeId: promo.id,
      title: promo.title,
      cost_points: promo.cost_points,
      user_discount_percent: promo.user_cashback_percent,
      partner_name: promo.partner_name,
      message: `Списать ${promo.cost_points} бонусов и получить скидку ${promo.user_cashback_percent}% в «${promo.partner_name ?? "партнёре"}»?`
    });
  }

  const voucherToken = isPartnerKind(promo.kind) ? generateVoucherToken() : null;
  const expiresAt = voucherToken ? voucherExpiresAt(30) : null;

  const [redemption] = await db.insert(promo_redemptions).values({
    user_id: user.id,
    promo_code_id: promo.id,
    voucher_token: voucherToken,
    status: "active",
    expires_at: expiresAt,
    cost_points_snapshot: promo.cost_points,
    user_discount_snapshot: promo.user_cashback_percent,
    platform_fee_snapshot: promo.platform_fee_percent,
    partner_name_snapshot: promo.partner_name
  }).returning();

  if (promo.cost_points > 0) {
    await db.insert(bonus_transactions).values({
      user_id: user.id,
      points: -promo.cost_points,
      type: "promo_redemption",
      source: promo.code,
      meta: { promoId: promo.id, kind: promo.kind, redemptionId: redemption.id, voucherToken }
    });
  }

  let rewardGranted = 0;
  if (promo.reward_points > 0) {
    rewardGranted = promo.reward_points;
    await db.insert(bonus_transactions).values({
      user_id: user.id,
      points: promo.reward_points,
      type: "promo_reward",
      source: promo.code,
      meta: { promoId: promo.id, kind: promo.kind }
    });
  }

  const newBalanceResult = await db.select({ points: sql<number>`coalesce(sum(points), 0)` })
    .from(bonus_transactions)
    .where(eq(bonus_transactions.user_id, user.id));

  const userDiscount = promo.user_cashback_percent;
  const voucherUrl = voucherToken ? partnerVoucherUrl(voucherToken) : null;

  return NextResponse.json({
    success: true,
    code: promo.code,
    title: promo.title,
    kind: promo.kind,
    partner_name: promo.partner_name,
    user_discount_percent: userDiscount,
    cost_points: promo.cost_points,
    reward_points: rewardGranted,
    newBalance: Number(newBalanceResult[0]?.points ?? 0),
    voucher_token: voucherToken,
    voucher_url: voucherUrl,
    status: "active",
    expires_at: expiresAt?.toISOString(),
    message: isPartnerKind(promo.kind)
      ? `Списано ${promo.cost_points} бонусов. Скидка ${userDiscount}% — покажите QR сотруднику «${promo.partner_name ?? "партнёра"}».`
      : `Активировано!${rewardGranted > 0 ? ` +${rewardGranted} бонусов` : ""}`
  });
}
