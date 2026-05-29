import crypto from "crypto";

/** Парсит initData строку из Telegram Web App в объект */
export function parseTelegramInitData(initData: string) {
  const params = new URLSearchParams(initData);
  const userRaw = params.get("user");
  const user = userRaw ? JSON.parse(userRaw) : null;

  return {
    user,
    start_param: params.get("start_param") ?? undefined,
    auth_date: params.get("auth_date") ?? undefined,
    hash: params.get("hash") ?? undefined
  };
}

/**
 * Проверяет подпись initData по алгоритму Telegram.
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramInitData(initData: string): boolean {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN не задан");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;

  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(token).digest();
  const calculatedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  return calculatedHash === hash;
}
