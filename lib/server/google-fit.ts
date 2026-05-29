import { db } from "@/lib/drizzle";
import { bonus_transactions, steps, users } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_FIT_AGGREGATE = "https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate";

export async function exchangeGoogleCode(code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URL;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google OAuth не настроен");
  }

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code"
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  if (!response.ok) {
    throw new Error("Не удалось обменять код Google OAuth");
  }

  return response.json();
}

export async function getGoogleSteps(accessToken: string) {
  const endMs = Date.now();
  const startMs = new Date(new Date().setHours(0, 0, 0, 0)).valueOf();

  const requestBody = {
    aggregateBy: [{
      dataTypeName: "com.google.step_count.delta"
    }],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: startMs,
    endTimeMillis: endMs
  };

  const resp = await fetch(GOOGLE_FIT_AGGREGATE, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  if (!resp.ok) {
    throw new Error("Ошибка получения данных Google Fit");
  }

  const data = await resp.json();
  const bucket = data.bucket?.[0];
  const totalSteps = bucket?.dataset?.[0]?.point?.reduce((sum: number, point: any) => {
    const value = point.value?.[0]?.intVal ?? 0;
    return sum + value;
  }, 0) ?? 0;

  return totalSteps;
}

export async function storeGoogleSteps(telegramId: string, totalSteps: number) {
  const user = await db.select().from(users).where(eq(users.telegram_id, telegramId)).then(rows => rows[0]);
  if (!user) throw new Error("Пользователь не найден");

  const date = new Date().toISOString().slice(0, 10);
  const source = "google-fit";
  const existing = await db.select().from(steps).where(and(eq(steps.user_id, user.id), eq(steps.date, date), eq(steps.source, source))).then(rows => rows[0]);

  if (existing && existing.step_count >= totalSteps) {
    return { totalSteps, newPoints: 0 };
  }

  if (existing) {
    await db.update(steps).set({ step_count: totalSteps, recorded_at: sql`now()` }).where(eq(steps.id, existing.id));
  } else {
    await db.insert(steps).values({ user_id: user.id, source, date, step_count: totalSteps });
  }

  const totals = await db.execute(sql`SELECT COALESCE(SUM(step_count), 0) AS total FROM steps WHERE user_id = ${user.id} AND date = ${date}`);
  const totalDay = Number(totals[0]?.total ?? 0);
  const alreadyPoints = await db.select({ points: sql`coalesce(sum(points), 0)` })
    .from(bonus_transactions)
    .where(and(eq(bonus_transactions.user_id, user.id), eq(bonus_transactions.type, "step"), sql`created_at::date = ${date}`));

  const currentAwarded = Number(alreadyPoints[0]?.points ?? 0);
  const targetPoints = Math.floor(totalDay / 1000);
  const newPoints = Math.max(0, targetPoints - currentAwarded);

  if (newPoints > 0) {
    await db.insert(bonus_transactions).values({
      user_id: user.id,
      points: newPoints,
      type: "step",
      source: "google-fit",
      meta: { totalDay }
    });
  }

  return { totalSteps: totalDay, newPoints };
}
