import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { db } from "@/lib/drizzle";
import { partner_settlements } from "@/lib/db/schema";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const rows = await db.select().from(partner_settlements)
    .orderBy(sql`${partner_settlements.confirmed_at} DESC`)
    .limit(200);

  return NextResponse.json(rows);
}
