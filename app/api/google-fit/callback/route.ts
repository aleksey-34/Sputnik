import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode, saveGoogleConnection, syncGoogleFitForUser } from "@/lib/server/google-fit";
import { db } from "@/lib/drizzle";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return new NextResponse("Код авторизации не найден", { status: 400 });
  }

  const telegramId = request.cookies.get("sputnik_telegram_id")?.value;
  if (!telegramId) {
    return new NextResponse("Пользователь не аутентифицирован", { status: 401 });
  }

  const user = await db.select().from(users).where(eq(users.telegram_id, telegramId)).then(r => r[0]);
  if (!user) {
    return new NextResponse("Пользователь не найден", { status: 404 });
  }

  const tokenResponse = await exchangeGoogleCode(code);
  const accessToken = tokenResponse.access_token;
  if (!accessToken) {
    return new NextResponse("Не удалось получить access token", { status: 500 });
  }

  await saveGoogleConnection(user.id, tokenResponse);

  // После подключения — автосинхронизация шагов за сегодня
  try {
    await syncGoogleFitForUser(telegramId, "today");
  } catch {
    // OAuth прошёл, синхронизацию можно повторить вручную
  }

  const url = new URL("/", request.url);
  url.searchParams.set("google", "connected");
  url.searchParams.set("autosync", "1");
  return NextResponse.redirect(url.toString());
}
