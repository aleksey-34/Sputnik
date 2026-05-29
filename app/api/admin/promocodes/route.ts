import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { db } from "@/lib/drizzle";
import { promo_codes, promo_redemptions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

function validateDiscount(body: Record<string, unknown>) {
  const discount = Number(body.discount_percent ?? 0);
  const userCb = Number(body.user_cashback_percent ?? 0);
  const platformFee = Number(body.platform_fee_percent ?? 0);
  if (discount > 0 && userCb + platformFee !== discount) {
    return "Маржа партнёра должна равняться скидке клиенту + доле платформы";
  }
  return null;
}

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const codes = await db.select().from(promo_codes).orderBy(promo_codes.id);

  const enriched = await Promise.all(codes.map(async promo => {
    const [count] = await db.select({ n: sql<number>`count(*)` })
      .from(promo_redemptions)
      .where(eq(promo_redemptions.promo_code_id, promo.id));
    return { ...promo, redemptions_count: Number(count?.n ?? 0) };
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const body = await request.json();
  const { code, title, description, kind, partner_name, partner_pin, cost_points, reward_points,
    discount_percent, user_cashback_percent, platform_fee_percent, active } = body;

  if (!code || !title) {
    return new NextResponse("code и title обязательны", { status: 400 });
  }

  const discountError = validateDiscount(body);
  if (discountError) return new NextResponse(discountError, { status: 400 });

  await db.insert(promo_codes).values({
    code,
    title,
    description,
    kind: kind ?? "bonus_shop",
    partner_name: partner_name || null,
    partner_pin: partner_pin || null,
    cost_points: Number(cost_points ?? 0),
    reward_points: Number(reward_points ?? 0),
    required_steps: 0,
    discount_percent: Number(discount_percent ?? 0),
    user_cashback_percent: Number(user_cashback_percent ?? 0),
    platform_fee_percent: Number(platform_fee_percent ?? 0),
    active: active !== false
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const body = await request.json();
  const id = Number(body.id);
  if (!id) return new NextResponse("id обязателен", { status: 400 });

  const existing = await db.select().from(promo_codes).where(eq(promo_codes.id, id)).then(r => r[0]);
  if (!existing) return new NextResponse("Акция не найдена", { status: 404 });

  const merged = {
    discount_percent: body.discount_percent ?? existing.discount_percent,
    user_cashback_percent: body.user_cashback_percent ?? existing.user_cashback_percent,
    platform_fee_percent: body.platform_fee_percent ?? existing.platform_fee_percent
  };
  const discountError = validateDiscount(merged);
  if (discountError) return new NextResponse(discountError, { status: 400 });

  if (body.code && body.code !== existing.code) {
    const dup = await db.select().from(promo_codes)
      .where(eq(promo_codes.code, body.code)).then(r => r[0]);
    if (dup) return new NextResponse("Код уже занят", { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  for (const key of ["code", "title", "description", "kind", "partner_name", "partner_pin", "active"] as const) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  for (const key of ["cost_points", "reward_points", "discount_percent", "user_cashback_percent", "platform_fee_percent"] as const) {
    if (body[key] !== undefined) updates[key] = Number(body[key]);
  }

  await db.update(promo_codes).set(updates).where(eq(promo_codes.id, id));
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return new NextResponse("id обязателен", { status: 400 });

  const [count] = await db.select({ n: sql<number>`count(*)` })
    .from(promo_redemptions).where(eq(promo_redemptions.promo_code_id, id));

  if (Number(count?.n ?? 0) > 0) {
    await db.update(promo_codes).set({ active: false }).where(eq(promo_codes.id, id));
    return NextResponse.json({ success: true, deactivated: true, message: "Есть активации — акция деактивирована вместо удаления" });
  }

  await db.delete(promo_codes).where(eq(promo_codes.id, id));
  return NextResponse.json({ success: true, deleted: true });
}
