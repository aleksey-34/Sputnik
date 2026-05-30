const TELEGRAM_API = "https://api.telegram.org/bot";

type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    chat: { id: number };
    text?: string;
  };
};

function botToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан");
  return token;
}

function appUrl() {
  return (process.env.APP_URL ?? "https://sputnik.battletoads.top").replace(/\/$/, "");
}

async function telegramApi(method: string, body: Record<string, unknown>) {
  const res = await fetch(`${TELEGRAM_API}${botToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Telegram ${method} failed:`, text);
  }
  return res;
}

function menuKeyboard() {
  const base = appUrl();
  return {
    inline_keyboard: [
      [{ text: "🌐 Основное приложение", web_app: { url: base } }],
      [{ text: "🤝 Партнёрский раздел", web_app: { url: `${base}/partner` } }]
    ]
  };
}

export async function sendBotMenu(chatId: number, intro?: string) {
  await telegramApi("sendMessage", {
    chat_id: chatId,
    text: intro ?? "Выберите раздел:",
    reply_markup: menuKeyboard()
  });
}

export async function handleTelegramUpdate(update: TelegramUpdate) {
  const text = update.message?.text?.trim();
  const chatId = update.message?.chat.id;
  if (!text || chatId == null) return;

  if (text === "/start" || text.startsWith("/start ") || text === "/partner") {
    const greeting = text.startsWith("/start")
      ? "👋 Добро пожаловать в Спутник!\n\nШагайте, получайте бонусы и обменивайте их на награды."
      : "🤝 Кабинет партнёра — сканирование QR-ваучеров клиентов.";
    await sendBotMenu(chatId, greeting);
  }
}

export async function setTelegramWebhook(webhookUrl: string) {
  const res = await fetch(`${TELEGRAM_API}${botToken()}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message"],
      drop_pending_updates: true
    })
  });
  return res.json();
}
