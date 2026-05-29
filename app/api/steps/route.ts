import { NextRequest, NextResponse } from "next/server";

/** Ручной ввод шагов отключён — только Google Fit */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    { error: "MANUAL_DISABLED", message: "Ручной ввод отключён. Подключите Google Fit." },
    { status: 403 }
  );
}
