import { db } from "@/lib/drizzle";
import { bonus_transactions, referrals, users } from "@/lib/db/schema";
import { getSetting } from "@/lib/server/steps";
import { eq, sql } from "drizzle-orm";

export function appPublicUrl() {
  return process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://sputnik.battletoads.top";
}

/** Реферальная ссылка: startapp передаёт start_param в Mini App (start= — только в чат бота) */
export function buildReferralLink(telegramId: string) {
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "WeGoWithSputnik_bot";
  return `https://t.me/${bot}?startapp=${telegramId}`;
}

export async function applyReferralIfEligible(inviteeId: number, startParam?: string) {
  if (!startParam?.trim()) return false;

  const already = await db.select().from(referrals)
    .where(eq(referrals.invitee_id, inviteeId)).then(r => r[0]);
  if (already) return false;

  const inviter = await db.select().from(users)
    .where(eq(users.telegram_id, startParam.trim())).then(r => r[0]);
  if (!inviter || inviter.id === inviteeId) return false;

  const referralBonus = Number(await getSetting("referral_bonus", "10"));

  await db.insert(referrals).values({
    inviter_id: inviter.id,
    invitee_id: inviteeId,
    reward_given: true
  });
  await db.insert(bonus_transactions).values({
    user_id: inviter.id,
    points: referralBonus,
    type: "referral",
    source: "referral",
    meta: { invitee_id: inviteeId, invitee_telegram_id: startParam.trim() }
  });

  return true;
}

export async function createOrUpdateUser(payload: {
  telegram_id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  avatar_url?: string;
  start_param?: string;
}) {
  const existingUser = await db.select().from(users).where(eq(users.telegram_id, payload.telegram_id)).limit(1).then(rows => rows[0]);

  if (existingUser) {
    await db.update(users)
      .set({
        first_name: payload.first_name,
        last_name: payload.last_name,
        username: payload.username,
        avatar_url: payload.avatar_url,
        updated_at: sql`now()`
      })
      .where(eq(users.id, existingUser.id));

    await applyReferralIfEligible(existingUser.id, payload.start_param);
    return existingUser;
  }

  const result = await db.insert(users).values({
    telegram_id: payload.telegram_id,
    first_name: payload.first_name,
    last_name: payload.last_name,
    username: payload.username,
    avatar_url: payload.avatar_url
  }).returning({ id: users.id });

  const newUserId = result[0]?.id;
  if (newUserId) {
    await applyReferralIfEligible(newUserId, payload.start_param);
  }

  return await db.select().from(users).where(eq(users.id, newUserId!)).then(rows => rows[0]);
}

export async function getProfileWithBonuses(telegramId: string) {
  const profile = await db.select().from(users).where(eq(users.telegram_id, telegramId)).then(rows => rows[0]);
  if (!profile) return null;

  const balanceResult = await db.select({ points: sql`coalesce(sum(points), 0)` })
    .from(bonus_transactions)
    .where(eq(bonus_transactions.user_id, profile.id));

  const points = Number(balanceResult[0]?.points ?? 0);
  return { profile, points };
}

export function registrationDateStr(createdAt: Date) {
  return createdAt.toISOString().slice(0, 10);
}
