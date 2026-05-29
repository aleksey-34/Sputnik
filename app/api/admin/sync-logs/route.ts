import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { db } from "@/lib/drizzle";
import { step_sync_logs, users } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const logs = await db.select({
    id: step_sync_logs.id,
    created_at: step_sync_logs.created_at,
    user_id: step_sync_logs.user_id,
    source: step_sync_logs.source,
    period: step_sync_logs.period,
    date_from: step_sync_logs.date_from,
    date_to: step_sync_logs.date_to,
    days_synced: step_sync_logs.days_synced,
    steps_synced: step_sync_logs.steps_synced,
    bonus_awarded: step_sync_logs.bonus_awarded,
    status: step_sync_logs.status,
    meta: step_sync_logs.meta,
    first_name: users.first_name,
    username: users.username
  })
    .from(step_sync_logs)
    .leftJoin(users, eq(step_sync_logs.user_id, users.id))
    .orderBy(sql`${step_sync_logs.created_at} DESC`)
    .limit(100);

  return NextResponse.json(logs);
}
