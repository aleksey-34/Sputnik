import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { db } from "@/lib/drizzle";
import { app_settings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const settings = await db.select().from(app_settings);
  return NextResponse.json(Object.fromEntries(settings.map(s => [s.key, s.value])));
}

export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const body = await request.json();

  for (const [key, value] of Object.entries(body)) {
    await db.insert(app_settings).values({ key, value: String(value) })
      .onConflictDoUpdate({
        target: app_settings.key,
        set: { value: String(value), updated_at: sql`now()` }
      });
  }

  return NextResponse.json({ success: true });
}
