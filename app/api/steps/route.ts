import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { upsertDailySteps } from "@/lib/server/steps";
import { step_sync_logs } from "@/lib/db/schema";
import { periodDateRange, toDateStr } from "@/lib/server/steps";

function getTelegramId(request: NextRequest) {
  return request.cookies.get("sputnik_telegram_id")?.value ?? null;
}

export async function POST(request: NextRequest) {
  const telegramId = getTelegramId(request);
  if (!telegramId) {
    return new NextResponse("Пользователь не аутентифицирован", { status: 401 });
  }

  const user = await db.select().from(users).where(eq(users.telegram_id, telegramId)).then(r => r[0]);
  if (!user) {
    return new NextResponse("Пользователь не найден", { status: 404 });
  }

  const body = await request.json();
  const stepCount = Number(body.stepCount ?? 0);
  const source = String(body.source ?? "manual");

  if (stepCount <= 0) {
    return new NextResponse("Количество шагов должно быть больше нуля", { status: 400 });
  }

  const date = toDateStr(new Date());
  const result = await upsertDailySteps({ userId: user.id, source, date, stepCount });

  if (result.skipped) {
    return new NextResponse("Дублирование шага предотвращено", { status: 409 });
  }

  const { start, end } = periodDateRange("today");
  await db.insert(step_sync_logs).values({
    user_id: user.id,
    source,
    period: "today",
    date_from: toDateStr(start),
    date_to: toDateStr(end),
    days_synced: 1,
    steps_synced: stepCount,
    bonus_awarded: result.newPoints,
    status: "success",
    meta: { manual: true }
  });

  return NextResponse.json({ totalSteps: result.stored, newPoints: result.newPoints });
}
