import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { db } from "@/lib/drizzle";
import {
  bonus_transactions,
  google_fit_connections,
  promo_codes,
  promo_redemptions,
  referrals,
  step_sync_logs,
  steps,
  users
} from "@/lib/db/schema";
import { eq, or, sql } from "drizzle-orm";
import { getTotalSteps, getVerifiedSteps } from "@/lib/server/steps";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const userId = Number((await params).id);
  if (!userId) return new NextResponse("Некорректный id", { status: 400 });

  const user = await db.select().from(users).where(eq(users.id, userId)).then(r => r[0]);
  if (!user) return new NextResponse("Пользователь не найден", { status: 404 });

  const [bonus] = await db.select({ points: sql<number>`coalesce(sum(points), 0)` })
    .from(bonus_transactions).where(eq(bonus_transactions.user_id, userId));

  const totalSteps = await getTotalSteps(userId);
  const verifiedSteps = await getVerifiedSteps(userId);

  const googleFit = await db.select().from(google_fit_connections)
    .where(eq(google_fit_connections.user_id, userId)).then(r => r[0]);

  const [syncStats] = await db.select({
    count: sql<number>`count(*)`,
    lastAt: sql<string>`max(created_at)`
  }).from(step_sync_logs).where(eq(step_sync_logs.user_id, userId));

  const redemptions = await db.select({
    id: promo_redemptions.id,
    redeemed_at: promo_redemptions.redeemed_at,
    code: promo_codes.code,
    title: promo_codes.title,
    kind: promo_codes.kind,
    partner_name: promo_codes.partner_name
  })
    .from(promo_redemptions)
    .innerJoin(promo_codes, eq(promo_redemptions.promo_code_id, promo_codes.id))
    .where(eq(promo_redemptions.user_id, userId))
    .orderBy(sql`${promo_redemptions.redeemed_at} DESC`);

  const transactions = await db.select()
    .from(bonus_transactions)
    .where(eq(bonus_transactions.user_id, userId))
    .orderBy(sql`${bonus_transactions.created_at} DESC`)
    .limit(50);

  const invited = await db.select({
    id: users.id,
    first_name: users.first_name,
    username: users.username,
    created_at: referrals.created_at
  })
    .from(referrals)
    .innerJoin(users, eq(referrals.invitee_id, users.id))
    .where(eq(referrals.inviter_id, userId));

  const invitedBy = await db.select({
    id: users.id,
    first_name: users.first_name,
    username: users.username
  })
    .from(referrals)
    .innerJoin(users, eq(referrals.inviter_id, users.id))
    .where(eq(referrals.invitee_id, userId))
    .then(r => r[0] ?? null);

  const recentSteps = await db.select({
    date: steps.date,
    source: steps.source,
    step_count: steps.step_count
  })
    .from(steps)
    .where(eq(steps.user_id, userId))
    .orderBy(sql`${steps.date} DESC`)
    .limit(14);

  return NextResponse.json({
    ...user,
    bonusPoints: Number(bonus?.points ?? 0),
    totalSteps,
    verifiedSteps,
    googleFitConnected: Boolean(googleFit),
    syncCount: Number(syncStats?.count ?? 0),
    lastSyncAt: syncStats?.lastAt ?? null,
    redemptions,
    transactions,
    referralsSent: invited,
    referredBy: invitedBy,
    recentSteps
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const userId = Number((await params).id);
  if (!userId) return new NextResponse("Некорректный id", { status: 400 });

  const user = await db.select().from(users).where(eq(users.id, userId)).then(r => r[0]);
  if (!user) return new NextResponse("Пользователь не найден", { status: 404 });

  const body = await request.json();

  const profileUpdates: Record<string, unknown> = {};
  for (const key of ["first_name", "last_name", "username", "gender", "birth_year", "height_cm", "weight_kg"] as const) {
    if (body[key] !== undefined) profileUpdates[key] = body[key];
  }
  if (Object.keys(profileUpdates).length > 0) {
    await db.update(users).set({ ...profileUpdates, updated_at: sql`now()` }).where(eq(users.id, userId));
  }

  if (body.bonusAdjustment !== undefined) {
    const delta = Number(body.bonusAdjustment);
    if (!Number.isFinite(delta) || delta === 0) {
      return new NextResponse("bonusAdjustment должен быть ненулевым числом", { status: 400 });
    }
    await db.insert(bonus_transactions).values({
      user_id: userId,
      points: delta,
      type: "admin_adjustment",
      source: "admin",
      meta: { reason: body.reason ?? "Корректировка администратором" }
    });
  }

  if (body.setBalance !== undefined) {
    const target = Number(body.setBalance);
    if (!Number.isFinite(target)) {
      return new NextResponse("setBalance должен быть числом", { status: 400 });
    }
    const [current] = await db.select({ points: sql<number>`coalesce(sum(points), 0)` })
      .from(bonus_transactions).where(eq(bonus_transactions.user_id, userId));
    const delta = target - Number(current?.points ?? 0);
    if (delta !== 0) {
      await db.insert(bonus_transactions).values({
        user_id: userId,
        points: delta,
        type: "admin_adjustment",
        source: "admin",
        meta: { reason: body.reason ?? `Установка баланса: ${target}` }
      });
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isAdminRequest(request)) {
    return new NextResponse("Недостаточно прав", { status: 403 });
  }

  const userId = Number((await params).id);
  if (!userId) return new NextResponse("Некорректный id", { status: 400 });

  await db.delete(referrals).where(or(eq(referrals.inviter_id, userId), eq(referrals.invitee_id, userId)));
  await db.delete(users).where(eq(users.id, userId));

  return NextResponse.json({ success: true });
}
