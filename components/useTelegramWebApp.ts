"use client";

import { useEffect, useState } from "react";

export function useTelegramWebApp() {
  const [isTelegram, setIsTelegram] = useState(false);
  const [startParam, setStartParam] = useState<string | undefined>();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg?.initData) {
      setIsTelegram(true);
      tg.ready();
      tg.expand();
      tg.setHeaderColor("#1A3668");
      tg.setBackgroundColor("#F4F7FB");
      const params = new URLSearchParams(tg.initData);
      const sp = params.get("start_param") ?? undefined;
      setStartParam(sp);
    }
  }, []);

  return { isTelegram, startParam, WebApp: typeof window !== "undefined" ? window.Telegram?.WebApp : undefined };
}
