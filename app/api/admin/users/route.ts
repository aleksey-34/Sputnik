import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { db } from "@/lib/drizzle";
import { bonus_transactions, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

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
    created_at: users.created_at
  }).from(users).orderBy(sql`${users.created_at} DESC`).limit(200);

  const enriched = await Promise.all(list.map(async user => {
    const [bonus] = await db.select({ points: sql<number>`coalesce(sum(points), 0)` })
      .from(bonus_transactions).where(eq(bonus_transactions.user_id, user.id));
    const steps = await db.execute<{ total: number }>(
      sql`SELECT COALESCE(SUM(step_count), 0) AS total FROM steps WHERE user_id = ${user.id}`
    );
    return {
      ...user,
      bonusPoints: Number(bonus?.points ?? 0),
      totalSteps: Number(steps[0]?.total ?? 0)
    };
  }));

  return NextResponse.json(enriched);
}
