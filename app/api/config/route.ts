import { NextResponse } from "next/server";
import { getWelcomeBonus } from "@/lib/server/settings";
import { getSetting } from "@/lib/server/steps";

export async function GET() {
  const stepsPerBonus = await getSetting("steps_per_bonus", "1000");
  const referralBonus = await getSetting("referral_bonus", "10");
  const welcomeBonus = await getWelcomeBonus();

  return NextResponse.json({
    stepsPerBonus: Number(stepsPerBonus),
    referralBonus: Number(referralBonus),
    welcomeBonus,
    about: {
      title: "Спутник",
      description: "Telegram Mini App для трекинга шагов, начисления бонусов и партнёрских акций.",
      rules: [
        `1 бонус за каждые ${stepsPerBonus} шагов (Google Fit)`,
        `${referralBonus} бонусов за приглашённого друга`,
        "Бонусы тратятся в магазине и на партнёрских акциях",
        `Приветственный бонус: ${welcomeBonus} ${welcomeBonus === 1 ? "балл" : "баллов"} при регистрации`
      ]
    }
  });
}
