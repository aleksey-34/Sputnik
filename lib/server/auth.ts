import { db } from "@/lib/drizzle";
import { bonus_transactions, referrals, users } from "@/lib/db/schema";
import { getSetting } from "@/lib/server/steps";
import { eq, sql } from "drizzle-orm";

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

  if (payload.start_param && newUserId) {
    const inviter = await db.select().from(users).where(eq(users.telegram_id, payload.start_param)).limit(1).then(rows => rows[0]);
    if (inviter && inviter.id !== newUserId) {
      const referralBonus = Number(await getSetting("referral_bonus", "25"));
      await db.insert(referrals).values({ inviter_id: inviter.id, invitee_id: newUserId, reward_given: true });
      await db.insert(bonus_transactions).values({
        user_id: inviter.id,
        points: referralBonus,
        type: "referral",
        source: "referral",
        meta: { invitee_id: newUserId }
      });
    }
  }

  return await db.select().from(users).where(eq(users.id, newUserId)).then(rows => rows[0]);
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
