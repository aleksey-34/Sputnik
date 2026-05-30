import { db } from "@/lib/drizzle";
import { partner_event_logs } from "@/lib/db/schema";

type PartnerEventInput = {
  event: string;
  userId?: number;
  redemptionId?: number;
  promoCodeId?: number;
  partnerName?: string;
  status?: "ok" | "error";
  meta?: Record<string, unknown>;
};

/** Журнал активаций QR, сканов партнёра и ошибок */
export async function logPartnerEvent(input: PartnerEventInput) {
  try {
    await db.insert(partner_event_logs).values({
      event: input.event,
      user_id: input.userId ?? null,
      redemption_id: input.redemptionId ?? null,
      promo_code_id: input.promoCodeId ?? null,
      partner_name: input.partnerName ?? null,
      status: input.status ?? "ok",
      meta: input.meta ?? null
    });
  } catch (err) {
    console.error("partner_event_log failed:", err);
  }
}
