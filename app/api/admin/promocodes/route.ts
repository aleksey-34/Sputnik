import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { db } from "@/lib/drizzle";
import { promo_codes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const codes = await db.select().from(promo_codes).orderBy(promo_codes.id);
  return NextResponse.json(codes);
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const body = await request.json();
  const { code, title, description, cost_points, reward_points, active } = body;
  if (!code || !title) {
    return new NextResponse("code и title обязательны", { status: 400 });
  }

  await db.insert(promo_codes).values({
    code,
    title,
    description,
    cost_points: Number(cost_points ?? 0),
    reward_points: Number(reward_points ?? 0),
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
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.cost_points !== undefined) updates.cost_points = Number(body.cost_points);
  if (body.reward_points !== undefined) updates.reward_points = Number(body.reward_points);
  if (body.active !== undefined) updates.active = Boolean(body.active);

  await db.update(promo_codes).set(updates).where(eq(promo_codes.id, id));
  return NextResponse.json({ success: true });
}
