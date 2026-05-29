import { db } from "@/lib/drizzle";
import { app_settings, promo_codes } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSetting } from "@/lib/server/steps";

export async function getWelcomeBonus() {
  return Number(await getSetting("welcome_bonus", "5"));
}

/** Сохраняет welcome_bonus и синхронизирует промокод WELCOME50 */
export async function setWelcomeBonus(value: number) {
  await db.insert(app_settings).values({ key: "welcome_bonus", value: String(value) })
    .onConflictDoUpdate({
      target: app_settings.key,
      set: { value: String(value), updated_at: sql`now()` }
    });

  await db.update(promo_codes).set({
    reward_points: value,
    description: `${value} бонусов за регистрацию (≈ ${(value * 1000).toLocaleString("ru-RU")} шагов).`
  }).where(eq(promo_codes.code, "WELCOME50"));
}
