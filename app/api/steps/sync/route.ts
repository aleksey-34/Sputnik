import { NextRequest, NextResponse } from "next/server";
import { getGoogleFitStatus, syncGoogleFitForUser } from "@/lib/server/google-fit";

function getTelegramId(request: NextRequest) {
  return request.cookies.get("sputnik_telegram_id")?.value ?? null;
}

export async function GET(request: NextRequest) {
  const telegramId = getTelegramId(request);
  if (!telegramId) {
    return new NextResponse("Пользователь не аутентифицирован", { status: 401 });
  }

  const status = await getGoogleFitStatus(telegramId);
  const googleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URL
  );
  return NextResponse.json({ ...status, googleConfigured });
}

export async function POST(request: NextRequest) {
  const telegramId = getTelegramId(request);
  if (!telegramId) {
    return new NextResponse("Пользователь не аутентифицирован", { status: 401 });
  }

  try {
    const result = await syncGoogleFitForUser(telegramId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "GOOGLE_NOT_CONNECTED") {
      return NextResponse.json({ error: "GOOGLE_NOT_CONNECTED", message: "Сначала подключите Google Fit" }, { status: 428 });
    }
    return new NextResponse(message, { status: 500 });
  }
}
