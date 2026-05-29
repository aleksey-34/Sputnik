import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { db } from "@/lib/drizzle";
import { bonus_transactions, google_fit_connections, promo_redemptions, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getTotalSteps, getVerifiedSteps } from "@/lib/server/steps";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const list = await db.select({
    id: users.id,
    telegram_id: users.telegram_id,
    first_name: users.first_name,
    last_name: users.last_name,
    username: users.username,
    gender: users.gender,
    birth_year: users.birth_year,
    created_at: users.created_at
  }).from(users).orderBy(sql`${users.created_at} DESC`).limit(200);

  const enriched = await Promise.all(list.map(async user => {
    const [bonus] = await db.select({ points: sql<number>`coalesce(sum(points), 0)` })
      .from(bonus_transactions).where(eq(bonus_transactions.user_id, user.id));
    const totalSteps = await getTotalSteps(user.id);
    const verifiedSteps = await getVerifiedSteps(user.id);
    const [redemptions] = await db.select({ n: sql<number>`count(*)` })
      .from(promo_redemptions).where(eq(promo_redemptions.user_id, user.id));
    const googleFit = await db.select().from(google_fit_connections)
      .where(eq(google_fit_connections.user_id, user.id)).then(r => r[0]);

    return {
      ...user,
      bonusPoints: Number(bonus?.points ?? 0),
      totalSteps,
      verifiedSteps,
      redemptionsCount: Number(redemptions?.n ?? 0),
      googleFitConnected: Boolean(googleFit)
    };
  }));

  return NextResponse.json(enriched);
}
