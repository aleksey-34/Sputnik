"use client";

import {
  GOOGLE_FIT,
  openExternalLink
} from "@/lib/utils/google-fit-app";

/** Пошаговая инструкция для пользователя — как подключить шаги с телефона */
export function GoogleFitUserGuide() {
  return (
    <details className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
      <summary className="cursor-pointer font-medium text-blue-900">
        Как подключить шаги с телефона? (инструкция)
      </summary>
      <div className="mt-4 space-y-4 text-sm text-slate-700">
        <p>
          <strong>Важно:</strong> настройка Google Cloud уже сделана для «Спутника».
          Вам нужен только свой Google-аккаунт и приложение Google Fit на телефоне.
        </p>

        <div>
          <p className="mb-2 font-semibold text-slate-900">Шаг 0 — Google-почта</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Откройте <strong>accounts.google.com</strong></li>
            <li>Если аккаунта нет — «Создать аккаунт» → Gmail + пароль</li>
          </ol>
        </div>

        <div>
          <p className="mb-2 font-semibold text-slate-900">Шаг 1 — установите Google Fit</p>
          <div className="mb-3 flex flex-wrap gap-2">
            <a
              href={GOOGLE_FIT.playStore}
              onClick={e => { e.preventDefault(); openExternalLink(GOOGLE_FIT.playStore); }}
              className="rounded-full bg-primary px-4 py-2 text-sm text-white"
            >
              Android — Google Play
            </a>
            <a
              href={GOOGLE_FIT.appStore}
              onClick={e => { e.preventDefault(); openExternalLink(GOOGLE_FIT.appStore); }}
              className="rounded-full bg-slate-800 px-4 py-2 text-sm text-white"
            >
              iPhone — App Store
            </a>
          </div>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Установите Google Fit и войдите в <strong>свой</strong> Google-аккаунт</li>
            <li>Разрешите доступ к физической активности / Motion &amp; Fitness</li>
            <li>Пройдите 50–100 шагов — приложение начнёт считать</li>
            <li>
              <strong>Xiaomi / Redmi / POCO:</strong> шаги в «Здоровье» или Mi Fitness сами в Google не попадают —
              нужно установить <strong>Google Fit</strong> и включить в нём синхронизацию шагов с телефона
            </li>
            <li>
              <strong>iPhone:</strong> откройте Google Fit → убедитесь, что шаги отображаются внутри приложения
            </li>
          </ol>
        </div>

        <div>
          <p className="mb-2 font-semibold text-slate-900">Шаг 2 — в «Спутнике»</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Нажмите «Подключить Google Fit» → выберите тот же Google-аккаунт</li>
            <li>Если Google пишет «не проверено» → <strong>Дополнительные настройки</strong> → <strong>Перейти в Спутник</strong></li>
            <li>Разрешите доступ к данным о физической активности</li>
          </ol>
        </div>

        <div>
          <p className="mb-2 font-semibold text-slate-900">Шаг 3 — синхронизация</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Нажмите «Синхронизировать шаги» — подтянутся шаги <strong>только за сегодня</strong></li>
            <li>Бонусы начисляются с даты регистрации в приложении</li>
          </ol>
        </div>
      </div>
    </details>
  );
}
