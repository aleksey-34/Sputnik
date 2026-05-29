import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { db } from "@/lib/drizzle";
import { app_settings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getWelcomeBonus, setWelcomeBonus } from "@/lib/server/settings";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const settings = await db.select().from(app_settings);
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));

  if (!map.welcome_bonus) {
    map.welcome_bonus = String(await getWelcomeBonus());
  }

  return NextResponse.json(map);
}

export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const body = await request.json();

  if (body.welcome_bonus !== undefined) {
    await setWelcomeBonus(Number(body.welcome_bonus));
  }

  for (const [key, value] of Object.entries(body)) {
    if (key === "welcome_bonus") continue;
    await db.insert(app_settings).values({ key, value: String(value) })
      .onConflictDoUpdate({
        target: app_settings.key,
        set: { value: String(value), updated_at: sql`now()` }
      });
  }

  return NextResponse.json({ success: true });
}
