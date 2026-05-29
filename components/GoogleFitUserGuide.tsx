"use client";

/** Пошаговая инструкция для пользователя — как подключить шаги с телефона */
export function GoogleFitUserGuide() {
  return (
    <details className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
      <summary className="cursor-pointer font-medium text-blue-900">
        Как подключить шаги с телефона? (инструкция)
      </summary>
      <div className="mt-4 space-y-4 text-sm text-slate-700">
        <p>
          <strong>Важно:</strong> это делается один раз на вашем телефоне. Вам не нужно ничего настраивать
          в Google Cloud — это уже сделано для приложения «Спутник».
        </p>

        <div>
          <p className="mb-2 font-semibold text-slate-900">Шаг 0 — есть ли Google-почта?</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Откройте браузер на телефоне → <strong>accounts.google.com</strong></li>
            <li>Если аккаунта нет — «Создать аккаунт» → введите имя, придумайте Gmail и пароль</li>
            <li>Запомните email вида <code>имя@gmail.com</code> и пароль</li>
          </ol>
        </div>

        <div>
          <p className="mb-2 font-semibold text-slate-900">Шаг 1 — установите Google Fit (Android)</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Google Play → найдите <strong>Google Fit: мониторинг активности</strong></li>
            <li>Установите и откройте → войдите в свой Google-аккаунт</li>
            <li>Разрешите доступ к физической активности и датчикам</li>
            <li>Пройдите 50–100 шагов — Fit начнёт считать автоматически</li>
          </ol>
          <p className="mt-2 text-xs text-slate-500">
            iPhone: Apple Health из Mini App напрямую не подключается. Можно установить Google Fit на iOS
            или вводить шаги вручную.
          </p>
        </div>

        <div>
          <p className="mb-2 font-semibold text-slate-900">Шаг 2 — в «Спутнике» нажмите «Подключить Google Fit»</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Откроется окно Google → выберите <strong>свой</strong> аккаунт</li>
            <li>Нажмите «Разрешить» — приложение получит доступ только к шагам</li>
            <li>Вас вернёт обратно в Telegram</li>
          </ol>
        </div>

        <div>
          <p className="mb-2 font-semibold text-slate-900">Шаг 3 — «Синхронизировать шаги»</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Выберите период: сегодня / 7 / 30 дней</li>
            <li>Нажмите синхронизацию — шаги подтянутся с телефона</li>
            <li>Каждая синхронизация сохраняется в журнале (пруф для бонусов)</li>
          </ol>
        </div>

        <p className="rounded-xl bg-white p-3 text-xs text-slate-600">
          Нет Google Fit или не Android? Используйте «Ручной ввод» ниже — введите шаги за сегодня вручную.
        </p>
      </div>
    </details>
  );
}
