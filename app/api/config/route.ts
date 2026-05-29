import { NextResponse } from "next/server";
import { getSetting } from "@/lib/server/steps";

export async function GET() {
  const stepsPerBonus = await getSetting("steps_per_bonus", "1000");
  const referralBonus = await getSetting("referral_bonus", "25");

  return NextResponse.json({
    stepsPerBonus: Number(stepsPerBonus),
    referralBonus: Number(referralBonus),
    about: {
      title: "Спутник",
      description: "Telegram Mini App для трекинга шагов, начисления бонусов и партнёрских акций.",
      rules: [
        `1 бонус за каждые ${stepsPerBonus} шагов`,
        `${referralBonus} бонусов за каждого приглашённого друга`,
        "Синхронизация шагов через Google Fit (Android/iOS)",
        "Партнёрские акции — скидки и кешбэк за бонусы"
      ]
    }
  });
}
