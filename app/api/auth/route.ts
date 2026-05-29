import { NextRequest, NextResponse } from "next/server";
import { parseTelegramInitData, validateTelegramInitData } from "@/lib/utils/telegram";
import { createOrUpdateUser } from "@/lib/server/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const initData = String(body.initData ?? "");

  if (!initData || !validateTelegramInitData(initData)) {
    return new NextResponse("Невалидные данные Telegram", { status: 401 });
  }

  const parsed = parseTelegramInitData(initData);
  const tgUser = parsed.user;

  if (!tgUser?.id) {
    return new NextResponse("Данные пользователя не найдены", { status: 400 });
  }

  try {
    const user = await createOrUpdateUser({
      telegram_id: String(tgUser.id),
      first_name: tgUser.first_name ?? "User",
      last_name: tgUser.last_name,
      username: tgUser.username,
      avatar_url: tgUser.photo_url,
      start_param: parsed.start_param
    });

    const response = NextResponse.json({ user });
    response.cookies.set("sputnik_telegram_id", user.telegram_id, {
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30
    });
    return response;
  } catch (error) {
    return new NextResponse(String(error), { status: 500 });
  }
}
