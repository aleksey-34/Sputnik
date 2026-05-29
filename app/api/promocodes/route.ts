import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { promo_codes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const codes = await db.select().from(promo_codes).where(eq(promo_codes.active, true)).orderBy(promo_codes.cost_points);
  return NextResponse.json(codes);
}

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-admin-key");
  if (apiKey !== process.env.ADMIN_API_KEY) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const body = await request.json();
  const { code, title, description, cost_points, reward_points, expires_at } = body;
  if (!code || !title) {
    return new NextResponse("Поля code и title обязательны", { status: 400 });
  }

  await db.insert(promo_codes).values({
    code,
    title,
    description,
    cost_points: Number(cost_points ?? 0),
    reward_points: Number(reward_points ?? 0),
    expires_at: expires_at ? new Date(expires_at) : undefined,
    active: true
  });

  return NextResponse.json({ success: true });
}
