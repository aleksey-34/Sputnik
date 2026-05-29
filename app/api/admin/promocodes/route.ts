import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { db } from "@/lib/drizzle";
import { promo_codes, promo_redemptions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

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
  const { code, title, description, kind, partner_name, cost_points, reward_points, required_steps,
    discount_percent, user_cashback_percent, platform_fee_percent, active } = body;

  if (!code || !title) {
    return new NextResponse("code и title обязательны", { status: 400 });
  }

  const discount = Number(discount_percent ?? 0);
  const userCb = Number(user_cashback_percent ?? 0);
  const platformFee = Number(platform_fee_percent ?? 0);
  if (discount > 0 && userCb + platformFee !== discount) {
    return new NextResponse("Скидка партнёра должна равняться кешбэку юзера + доле платформы", { status: 400 });
  }

  await db.insert(promo_codes).values({
    code,
    title,
    description,
    kind: kind ?? "bonus_shop",
    partner_name: partner_name || null,
    cost_points: Number(cost_points ?? 0),
    reward_points: Number(reward_points ?? 0),
    required_steps: Number(required_steps ?? 0),
    discount_percent: discount,
    user_cashback_percent: userCb,
    platform_fee_percent: platformFee,
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

  const updates: Record<string, unknown> = {};
  for (const key of ["title", "description", "kind", "partner_name", "active"] as const) {
    if (body[key] !== undefined) updates[key] = body[key];
  }
  for (const key of ["cost_points", "reward_points", "required_steps", "discount_percent", "user_cashback_percent", "platform_fee_percent"] as const) {
    if (body[key] !== undefined) updates[key] = Number(body[key]);
  }

  await db.update(promo_codes).set(updates).where(eq(promo_codes.id, id));
  return NextResponse.json({ success: true });
}
