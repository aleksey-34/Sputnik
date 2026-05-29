import { db } from "@/lib/drizzle";
import { app_settings, bonus_transactions, steps } from "@/lib/db/schema";
import { and, eq, sql } from "drizzle-orm";

export async function getSetting(key: string, fallback: string) {
  const row = await db.select().from(app_settings).where(eq(app_settings.key, key)).then(r => r[0]);
  return row?.value ?? fallback;
}

export async function getStepsPerBonus() {
  return Number(await getSetting("steps_per_bonus", "1000"));
}

/** Сумма шагов из Google Fit (верифицированные, для порогов акций) */
export async function getVerifiedSteps(userId: number) {
  const result = await db.execute<{ total: number }>(
    sql`SELECT COALESCE(SUM(step_count), 0) AS total FROM steps WHERE user_id = ${userId} AND source = 'google-fit'`
  );
  return Number(result[0]?.total ?? 0);
}

/** Все шаги (все источники, для отображения) */
export async function getTotalSteps(userId: number) {
  const result = await db.execute<{ total: number }>(
    sql`SELECT COALESCE(SUM(step_count), 0) AS total FROM steps WHERE user_id = ${userId}`
  );
  return Number(result[0]?.total ?? 0);
}

/** Сохраняет шаги за день и начисляет бонусы без двойного начисления */
export async function upsertDailySteps(params: {
  userId: number;
  source: string;
  date: string;
  stepCount: number;
}) {
  const { userId, source, date, stepCount } = params;
  const stepsPerBonus = await getStepsPerBonus();

  const existing = await db.select().from(steps)
    .where(and(eq(steps.user_id, userId), eq(steps.date, date), eq(steps.source, source)))
    .then(r => r[0]);

  if (existing && existing.step_count >= stepCount) {
    return { stored: existing.step_count, newPoints: 0, skipped: true };
  }

  if (existing) {
    await db.update(steps).set({ step_count: stepCount, recorded_at: sql`now()` }).where(eq(steps.id, existing.id));
  } else {
    await db.insert(steps).values({ user_id: userId, source, date, step_count: stepCount });
  }

  const totals = await db.execute(
    sql`SELECT COALESCE(SUM(step_count), 0) AS total FROM steps WHERE user_id = ${userId} AND date = ${date}`
  );
  const totalDay = Number(totals[0]?.total ?? 0);

  const awarded = await db.select({ points: sql`coalesce(sum(points), 0)` })
    .from(bonus_transactions)
    .where(and(eq(bonus_transactions.user_id, userId), eq(bonus_transactions.type, "step"), sql`created_at::date = ${date}::date`));

  const alreadyPoints = Number(awarded[0]?.points ?? 0);
  const targetPoints = Math.floor(totalDay / stepsPerBonus);
  const newPoints = Math.max(0, targetPoints - alreadyPoints);

  if (newPoints > 0) {
    await db.insert(bonus_transactions).values({
      user_id: userId,
      points: newPoints,
      type: "step",
      source,
      meta: { totalDay, date }
    });
  }

  return { stored: totalDay, newPoints, skipped: false };
}

export function periodToDays(period: string): number {
  if (period === "today") return 1;
  if (period === "7d") return 7;
  if (period === "30d") return 30;
  return 1;
}

export function periodDateRange(period: string) {
  const days = periodToDays(period);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end, days };
}

export function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}
