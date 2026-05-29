import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { promo_codes } from "@/lib/db/schema";
import { and, eq, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind");

  if (kind === "bonus_shop") {
    const codes = await db.select().from(promo_codes)
      .where(and(eq(promo_codes.active, true), eq(promo_codes.kind, "bonus_shop")))
      .orderBy(promo_codes.cost_points);
    return NextResponse.json(codes);
  }

  if (kind === "showcase") {
    const codes = await db.select().from(promo_codes)
      .where(and(
        eq(promo_codes.active, true),
        or(eq(promo_codes.kind, "partner"), eq(promo_codes.kind, "quest"))
      ))
      .orderBy(promo_codes.id);
    return NextResponse.json(codes);
  }

  const codes = await db.select().from(promo_codes)
    .where(eq(promo_codes.active, true))
    .orderBy(promo_codes.cost_points);
  return NextResponse.json(codes);
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-admin-key");
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const body = await request.json();
  const { code, title, description, cost_points, reward_points, expires_at, kind, partner_name,
    required_steps, discount_percent, user_cashback_percent, platform_fee_percent } = body;
  if (!code || !title) {
    return new NextResponse("Поля code и title обязательны", { status: 400 });
  }

  await db.insert(promo_codes).values({
    code,
    title,
    description,
    kind: kind ?? "bonus_shop",
    partner_name,
    cost_points: Number(cost_points ?? 0),
    reward_points: Number(reward_points ?? 0),
    required_steps: Number(required_steps ?? 0),
    discount_percent: Number(discount_percent ?? 0),
    user_cashback_percent: Number(user_cashback_percent ?? 0),
    platform_fee_percent: Number(platform_fee_percent ?? 0),
    expires_at: expires_at ? new Date(expires_at) : undefined,
    active: true
  });

  return NextResponse.json({ success: true });
}
