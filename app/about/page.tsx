import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout } from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Спутник — трекер шагов и бонусов",
  description: "Telegram Mini App для учёта шагов, начисления бонусов и партнёрских акций"
};

export default function AboutPage() {
  return (
    <LegalLayout title="О приложении «Спутник»">
      <p>
        <strong>Спутник</strong> — Telegram Mini App для мотивации к активности: пользователи
        синхронизируют шаги, получают бонусы и тратят их в магазине промокодов или на партнёрских акциях.
      </p>

      <h2>Как это работает</h2>
      <ul>
        <li>Пользователь открывает бота <a href="https://t.me/WeGoWithSputnik_bot">@WeGoWithSputnik_bot</a> в Telegram</li>
        <li>Подключает Google Fit (опционально) или вводит шаги вручную</li>
        <li>За каждые 1000 шагов начисляется 1 бонус</li>
        <li>Бонусы можно обменять на промокоды и скидки у партнёров</li>
      </ul>

      <h2>Интеграция с Google Fit</h2>
      <p>
        При подключении Google Fit приложение запрашивает доступ только к данным о физической активности
        (количество шагов). Мы не получаем доступ к почте, контактам, местоположению или другим данным Google.
        Подробнее — в <Link href="/privacy">политике конфиденциальности</Link>.
      </p>

      <h2>Открыть приложение</h2>
      <p>
        <a
          href="https://t.me/WeGoWithSputnik_bot"
          className="inline-block rounded-2xl bg-primary px-6 py-3 text-white no-underline"
        >
          Открыть в Telegram
        </a>
      </p>

      <h2>Документы</h2>
      <ul>
        <li><Link href="/privacy">Политика конфиденциальности</Link></li>
        <li><Link href="/terms">Условия использования</Link></li>
      </ul>
    </LegalLayout>
  );
}
