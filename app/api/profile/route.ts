import { NextRequest, NextResponse } from "next/server";
import { getProfileWithBonuses } from "@/lib/server/auth";
import { db } from "@/lib/drizzle";
import { users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

function getTelegramId(request: NextRequest) {
  return request.cookies.get("sputnik_telegram_id")?.value ?? null;
}

export async function GET(request: NextRequest) {
  const telegramId = getTelegramId(request);
  if (!telegramId) {
    return new NextResponse("Пользователь не аутентифицирован", { status: 401 });
  }

  const data = await getProfileWithBonuses(telegramId);
  if (!data) {
    return new NextResponse("Пользователь не найден", { status: 404 });
  }

  const { profile, points } = data;
  const date = new Date().toISOString().slice(0, 10);
  const stepResult = await db.execute(
    sql`SELECT COALESCE(SUM(step_count), 0) AS total FROM steps WHERE user_id = ${profile.id} AND date = ${date}`
  );
  const stepsToday = Number(stepResult[0]?.total ?? 0);

  const profileComplete = Boolean(profile.gender && profile.height_cm && profile.weight_kg && profile.birth_year);

  return NextResponse.json({ profile, points, stepsToday, profileComplete });
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
  const { gender, height_cm, weight_kg, birth_year } = body;
  await db.update(users)
    .set({ gender, height_cm, weight_kg, birth_year, updated_at: sql`now()` })
    .where(eq(users.id, user.id));

  return NextResponse.json({ success: true });
}
