import { NextRequest, NextResponse } from "next/server";
import { appPublicUrl } from "@/lib/server/auth";
import { exchangeGoogleCode, saveGoogleConnection, syncGoogleFitForUser } from "@/lib/server/google-fit";
import { db } from "@/lib/drizzle";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");
  if (error) {
    const url = new URL("/", appPublicUrl());
    url.searchParams.set("google", "error");
    url.searchParams.set("google_error", error);
    return NextResponse.redirect(url.toString());
  }

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

  try {
    const tokenResponse = await exchangeGoogleCode(code);
    const accessToken = tokenResponse.access_token;
    if (!accessToken) {
      return new NextResponse("Не удалось получить access token", { status: 500 });
    }

    await saveGoogleConnection(user.id, tokenResponse);

    try {
      await syncGoogleFitForUser(telegramId);
    } catch {
      // OAuth прошёл, синхронизацию можно повторить вручную
    }

    const url = new URL("/", appPublicUrl());
    url.searchParams.set("google", "connected");
    url.searchParams.set("autosync", "1");
    return NextResponse.redirect(url.toString());
  } catch (e) {
    const url = new URL("/", appPublicUrl());
    url.searchParams.set("google", "error");
    url.searchParams.set("google_error", e instanceof Error ? e.message : "oauth_failed");
    return NextResponse.redirect(url.toString());
  }
}
