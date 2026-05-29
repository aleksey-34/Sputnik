import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { bonus_transactions, steps, users } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

function getTelegramId(request: NextRequest) {
  return request.cookies.get("sputnik_telegram_id")?.value ?? null;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const telegramId = getTelegramId(request);
  if (!telegramId) {
    return new NextResponse("Пользователь не аутентифицирован", { status: 401 });
  }

  const user = await db.select().from(users).where(eq(users.telegram_id, telegramId)).then(rows => rows[0]);
  if (!user) {
    return new NextResponse("Пользователь не найден", { status: 404 });
  }

  const date = new Date().toISOString().slice(0, 10);
  const stepCount = Number(body.stepCount ?? 0);
  const source = String(body.source ?? "manual");

  if (stepCount <= 0) {
    return new NextResponse("Количество шагов должно быть больше нуля", { status: 400 });
  }

  const existing = await db.select().from(steps).where(and(eq(steps.user_id, user.id), eq(steps.date, date), eq(steps.source, source))).then(rows => rows[0]);
  if (existing && existing.step_count >= stepCount) {
    return new NextResponse("Дублирование шага предотвращено", { status: 409 });
  }

  if (existing) {
    await db.update(steps)
      .set({ step_count: stepCount, recorded_at: sql`now()` })
      .where(eq(steps.id, existing.id));
  } else {
    await db.insert(steps).values({ user_id: user.id, source, date, step_count: stepCount });
  }

  const totals = await db.execute(sql`SELECT COALESCE(SUM(step_count), 0) AS total FROM steps WHERE user_id = ${user.id} AND date = ${date}`);
  const totalSteps = Number(totals[0]?.total ?? 0);
  const awardedResult = await db.execute(sql`SELECT COALESCE(SUM(points), 0) AS points FROM bonus_transactions WHERE user_id = ${user.id} AND type = 'step' AND created_at::date = ${date}`);
  const alreadyPoints = Number(awardedResult[0]?.points ?? 0);
  const targetPoints = Math.floor(totalSteps / 1000);
  const newPoints = Math.max(0, targetPoints - alreadyPoints);

  if (newPoints > 0) {
    await db.insert(bonus_transactions).values({
      user_id: user.id,
      points: newPoints,
      type: "step",
      source,
      meta: { totalSteps }
    });
  }

  return NextResponse.json({ totalSteps, newPoints });
}
