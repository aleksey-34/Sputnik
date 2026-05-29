"use client";

const GOOGLE_FIT_IOS = "https://apps.apple.com/app/google-fit-activity-tracker/id1433864494";
const GOOGLE_FIT_ANDROID = "https://play.google.com/store/apps/details?id=com.google.android.apps.fitness";

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
              href={GOOGLE_FIT_ANDROID}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-primary px-4 py-2 text-sm text-white"
            >
              Android — Google Play
            </a>
            <a
              href={GOOGLE_FIT_IOS}
              target="_blank"
              rel="noopener noreferrer"
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
