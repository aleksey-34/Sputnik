import { NextRequest, NextResponse } from "next/server";
import { handleTelegramUpdate } from "@/lib/server/telegram-bot";

export async function POST(request: NextRequest) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return new NextResponse("Bot not configured", { status: 503 });
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const update = await request.json();
    await handleTelegramUpdate(update);
  } catch (err) {
    console.error("Telegram webhook error:", err);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "sputnik-telegram-webhook" });
}
