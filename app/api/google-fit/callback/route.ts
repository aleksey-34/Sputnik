import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode, getGoogleSteps, storeGoogleSteps } from "@/lib/server/google-fit";
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

  const tokenResponse = await exchangeGoogleCode(code);
  const accessToken = tokenResponse.access_token;
  if (!accessToken) {
    return new NextResponse("Не удалось получить access token", { status: 500 });
  }

  const { totalSteps } = await storeGoogleSteps(telegramId, await getGoogleSteps(accessToken));
  return NextResponse.redirect(`/`);
}
