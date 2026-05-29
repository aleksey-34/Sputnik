import { NextRequest, NextResponse } from "next/server";
import { confirmPartnerVoucher } from "@/lib/server/partner";

const ERRORS: Record<string, { status: number; message: string }> = {
  VOUCHER_NOT_FOUND: { status: 404, message: "Ваучер не найден" },
  INVALID_PIN: { status: 403, message: "Неверный PIN партнёра" },
  INVALID_BILL: { status: 400, message: "Укажите сумму чека больше нуля" },
  ALREADY_USED: { status: 409, message: "Ваучер уже использован" },
  EXPIRED: { status: 410, message: "Срок действия ваучера истёк" }
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const token = String(body.token ?? "").trim();
  const pin = String(body.pin ?? "").trim();
  const billAmountRub = Number(body.billAmountRub);

  if (!token || !pin) {
    return new NextResponse("token и pin обязательны", { status: 400 });
  }

  try {
    const result = await confirmPartnerVoucher(token, pin, billAmountRub);
    return NextResponse.json({
      success: true,
      ...result,
      message: `Скидка ${result.discountAmountRub} ₽ (${result.discountPercent}%) для ${result.userName}. К оплате: ${result.clientPaysRub} ₽`
    });
  } catch (e) {
    const code = e instanceof Error ? e.message : "UNKNOWN";
    const err = ERRORS[code];
    if (err) {
      return NextResponse.json({ error: code, message: err.message }, { status: err.status });
    }
    return new NextResponse(String(e), { status: 500 });
  }
}
