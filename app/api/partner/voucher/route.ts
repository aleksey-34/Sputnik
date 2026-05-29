import { NextRequest, NextResponse } from "next/server";
import { lookupVoucher } from "@/lib/server/partner";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return new NextResponse("token обязателен", { status: 400 });
  }

  const lookup = await lookupVoucher(token);
  if (!lookup) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const { redemption, promo, user, expired } = lookup;
  const userName = [user.first_name, user.last_name].filter(Boolean).join(" ");

  return NextResponse.json({
    token,
    status: expired ? "expired" : redemption.status,
    title: promo.title,
    partner_name: promo.partner_name,
    user_name: userName,
    user_discount_percent: redemption.user_discount_snapshot,
    platform_fee_percent: redemption.platform_fee_snapshot,
    total_margin_percent: promo.discount_percent,
    expires_at: redemption.expires_at,
    used_at: redemption.used_at
  });
}
