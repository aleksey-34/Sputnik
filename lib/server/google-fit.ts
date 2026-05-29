import { db } from "@/lib/drizzle";
import { google_fit_connections, step_sync_logs, users } from "@/lib/db/schema";
import { periodDateRange, toDateStr, upsertDailySteps } from "@/lib/server/steps";
import { eq, sql } from "drizzle-orm";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_FIT_AGGREGATE = "https://fitness.googleapis.com/fitness/v1/users/me/dataset:aggregate";

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

export async function exchangeGoogleCode(code: string): Promise<TokenResponse> {
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

export async function saveGoogleConnection(userId: number, tokens: TokenResponse) {
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : null;

  const existing = await db.select().from(google_fit_connections)
    .where(eq(google_fit_connections.user_id, userId)).then(r => r[0]);

  if (existing) {
    await db.update(google_fit_connections).set({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? existing.refresh_token,
      expires_at: expiresAt,
      updated_at: sql`now()`
    }).where(eq(google_fit_connections.user_id, userId));
  } else {
    await db.insert(google_fit_connections).values({
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt
    });
  }
}

async function refreshGoogleToken(refreshToken: string): Promise<TokenResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuth не настроен");

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  if (!response.ok) throw new Error("Не удалось обновить Google token");
  return response.json();
}

export async function getValidGoogleAccessToken(userId: number) {
  const conn = await db.select().from(google_fit_connections)
    .where(eq(google_fit_connections.user_id, userId)).then(r => r[0]);

  if (!conn) return null;

  const expired = conn.expires_at && conn.expires_at.getTime() < Date.now() + 60_000;
  if (!expired) return conn.access_token;

  if (!conn.refresh_token) return null;

  const refreshed = await refreshGoogleToken(conn.refresh_token);
  await saveGoogleConnection(userId, { ...refreshed, refresh_token: conn.refresh_token });
  return refreshed.access_token;
}

/** Получает шаги по дням из Google Fit за период */
export async function fetchGoogleStepsByDay(accessToken: string, start: Date, end: Date) {
  const requestBody = {
    aggregateBy: [{ dataTypeName: "com.google.step_count.delta" }],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: start.getTime(),
    endTimeMillis: end.getTime()
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
    const err = await resp.text();
    throw new Error(`Google Fit API: ${err}`);
  }

  const data = await resp.json();
  const daily: { date: string; steps: number }[] = [];

  for (const bucket of data.bucket ?? []) {
    const startMs = Number(bucket.startTimeMillis ?? 0);
    const date = toDateStr(new Date(startMs));
    const points = bucket.dataset?.[0]?.point ?? [];
    const stepsCount = points.reduce((sum: number, point: { value?: { intVal?: number }[] }) => {
      return sum + (point.value?.[0]?.intVal ?? 0);
    }, 0);
    if (stepsCount > 0) {
      daily.push({ date, steps: stepsCount });
    }
  }

  return daily;
}

export async function syncGoogleFitForUser(telegramId: string, period: string) {
  const user = await db.select().from(users).where(eq(users.telegram_id, telegramId)).then(r => r[0]);
  if (!user) throw new Error("Пользователь не найден");

  const accessToken = await getValidGoogleAccessToken(user.id);
  if (!accessToken) {
    throw new Error("GOOGLE_NOT_CONNECTED");
  }

  const { start, end } = periodDateRange(period);
  const dailySteps = await fetchGoogleStepsByDay(accessToken, start, end);

  let totalSteps = 0;
  let totalBonus = 0;
  const dayDetails: { date: string; steps: number; bonus: number }[] = [];

  for (const day of dailySteps) {
    const result = await upsertDailySteps({
      userId: user.id,
      source: "google-fit",
      date: day.date,
      stepCount: day.steps
    });
    totalSteps += day.steps;
    totalBonus += result.newPoints;
    dayDetails.push({ date: day.date, steps: day.steps, bonus: result.newPoints });
  }

  await db.insert(step_sync_logs).values({
    user_id: user.id,
    source: "google-fit",
    period,
    date_from: toDateStr(start),
    date_to: toDateStr(end),
    days_synced: dailySteps.length,
    steps_synced: totalSteps,
    bonus_awarded: totalBonus,
    status: "success",
    meta: { dayDetails, provider: "Google Fit" }
  });

  return { totalSteps, totalBonus, daysSynced: dailySteps.length, dayDetails };
}

export async function getGoogleFitStatus(telegramId: string) {
  const user = await db.select().from(users).where(eq(users.telegram_id, telegramId)).then(r => r[0]);
  if (!user) return { connected: false, lastSync: null };

  const conn = await db.select().from(google_fit_connections)
    .where(eq(google_fit_connections.user_id, user.id)).then(r => r[0]);

  const lastSync = await db.select().from(step_sync_logs)
    .where(eq(step_sync_logs.user_id, user.id))
    .orderBy(sql`${step_sync_logs.created_at} DESC`)
    .limit(1).then(r => r[0]);

  return {
    connected: Boolean(conn),
    lastSync: lastSync ? {
      at: lastSync.created_at,
      period: lastSync.period,
      steps: lastSync.steps_synced,
      bonus: lastSync.bonus_awarded
    } : null
  };
}

/** Legacy: синхронизация только за сегодня после OAuth callback */
export async function storeGoogleSteps(telegramId: string, totalSteps: number) {
  const user = await db.select().from(users).where(eq(users.telegram_id, telegramId)).then(r => r[0]);
  if (!user) throw new Error("Пользователь не найден");

  const date = toDateStr(new Date());
  const result = await upsertDailySteps({
    userId: user.id,
    source: "google-fit",
    date,
    stepCount: totalSteps
  });

  return { totalSteps: result.stored, newPoints: result.newPoints };
}

export async function getGoogleStepsToday(accessToken: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  const daily = await fetchGoogleStepsByDay(accessToken, start, end);
  return daily.reduce((s, d) => s + d.steps, 0);
}
