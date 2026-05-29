import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { db } from "@/lib/drizzle";
import { bonus_transactions, step_sync_logs, users } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [syncCount] = await db.select({ count: sql<number>`count(*)` }).from(step_sync_logs);
  const [bonusSum] = await db.select({ total: sql<number>`coalesce(sum(points), 0)` }).from(bonus_transactions);
  const stepsSum = await db.execute<{ total: number }>(sql`SELECT COALESCE(SUM(step_count), 0) AS total FROM steps`);

  const recentSyncs = await db.select({
    id: step_sync_logs.id,
    created_at: step_sync_logs.created_at,
    period: step_sync_logs.period,
    source: step_sync_logs.source,
    steps_synced: step_sync_logs.steps_synced,
    bonus_awarded: step_sync_logs.bonus_awarded,
    status: step_sync_logs.status,
    user_id: step_sync_logs.user_id
  }).from(step_sync_logs).orderBy(sql`${step_sync_logs.created_at} DESC`).limit(20);

  return NextResponse.json({
    stats: {
      users: Number(userCount?.count ?? 0),
      syncs: Number(syncCount?.count ?? 0),
      totalBonuses: Number(bonusSum?.total ?? 0),
      totalSteps: Number(stepsSum[0]?.total ?? 0)
    },
    recentSyncs
  });
}
